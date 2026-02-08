import { Server } from "socket.io"
import axios from "axios"
import Trackmap from "../../models/trackmap"
import { getOpenF1Token } from "./auth"
import {
  OpenF1LocationMsg,
  OpenF1LapMsg,
  OpenF1SessionMsg,
  OpenF1DriverMsg,
  OpenF1Meeting,
  SessionState,
  DriverInfo,
  CarPositionPayload,
  ValidatedLap,
} from "./types"
import { buildTrackPath, filterFastLaps, shouldUpdate, hasTrackLayoutChanged } from "./trackmapBuilder"
import { fetchTrackOutline } from "./multiviewerClient"
import { computeTrackProgress, mapProgressToPoint } from "./trackProgress"

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Minimum interval between position batch emissions (ms).
const POSITION_BATCH_INTERVAL = 100

// Socket.IO event names for OpenF1 data.
export const OPENF1_EVENTS = {
  TRACKMAP: "openf1:trackmap",
  POSITIONS: "openf1:positions",
  SESSION: "openf1:session",
  DRIVERS: "openf1:drivers",
  DEMO_STATUS: "openf1:demo-status",
  SUBSCRIBE: "openf1:subscribe",
  UNSUBSCRIBE: "openf1:unsubscribe",
} as const

// Current active session state (null when no session is active).
let activeSession: SessionState | null = null

// Socket.IO server reference for emitting events.
let ioServer: Server | null = null

// Timer for batched position emissions.
let positionBatchTimer: ReturnType<typeof setInterval> | null = null

// Room name for clients receiving OpenF1 live data.
const OPENF1_ROOM = "openf1:live"

// ─── Initialization ──────────────────────────────────────────────

// Initializes the session manager with a Socket.IO server reference.
// Registers client subscribe/unsubscribe handlers for the openf1:live room.
export const initSessionManager = (io: Server): void => {
  ioServer = io

  // Register room management for the openf1:live room.
  io.on("connection", (socket) => {
    socket.on(OPENF1_EVENTS.SUBSCRIBE, () => {
      socket.join(OPENF1_ROOM)
      // Send current session state and track map to the new subscriber.
      if (activeSession) {
        socket.emit(OPENF1_EVENTS.SESSION, {
          active: true,
          trackName: activeSession.trackName,
          sessionType: activeSession.sessionType,
        })
        socket.emit(OPENF1_EVENTS.DRIVERS, Array.from(activeSession.drivers.values()))
        // Send the best available track path (MultiViewer preferred, GPS fallback).
        const displayPath = getDisplayPath()
        if (displayPath && displayPath.length > 0) {
          socket.emit(OPENF1_EVENTS.TRACKMAP, {
            trackName: activeSession.trackName,
            path: displayPath,
            pathVersion: activeSession.totalLapsProcessed,
            totalLapsProcessed: activeSession.totalLapsProcessed,
          })
        }
      } else {
        socket.emit(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "" })
      }
    })

    socket.on(OPENF1_EVENTS.UNSUBSCRIBE, () => {
      socket.leave(OPENF1_ROOM)
    })
  })
}

// Returns the active session's track name (used by GraphQL resolver).
export const getActiveTrackName = (): string | null => {
  return activeSession?.trackName ?? null
}

// Initializes a demo session directly without OpenF1 API calls.
// Sets activeSession synchronously first so replay messages aren't dropped,
// then loads the existing trackmap from MongoDB (fast local query).
export const initDemoSession = async (
  sessionKey: number,
  trackName: string,
  circuitKey: number | null,
  drivers: Map<number, DriverInfo>,
): Promise<void> => {
  activeSession = {
    sessionKey,
    meetingKey: 0,
    trackName,
    sessionType: "Demo",
    drivers,
    positionsByDriverLap: new Map(),
    currentPositions: new Map(),
    currentLapByDriver: new Map(),
    completedLaps: new Map(),
    bestLapTime: 0,
    totalLapsProcessed: 0,
    lastUpdateLap: 0,
    baselinePath: null,
    multiviewerPath: null,
  }

  // Load existing trackmap from MongoDB so the track appears instantly.
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      activeSession.baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      activeSession.totalLapsProcessed = existing.totalLapsProcessed
      activeSession.lastUpdateLap = existing.totalLapsProcessed
      console.log(`✓ Loaded existing track map for "${trackName}" (${existing.path.length} points, ${existing.totalLapsProcessed} laps)`)

      // Load cached MultiViewer outline if available.
      if (existing.multiviewerPath && existing.multiviewerPath.length > 0) {
        activeSession.multiviewerPath = existing.multiviewerPath.map((p) => ({ x: p.x, y: p.y }))
        console.log(`✓ Loaded cached MultiViewer outline for "${trackName}" (${existing.multiviewerPath.length} points)`)
      }
    }
  } catch (err) {
    console.error("⚠ Failed to load track map for demo:", err)
  }

  // Try to fetch MultiViewer outline if not cached.
  if (!activeSession.multiviewerPath) {
    await tryFetchMultiviewer(circuitKey, trackName)
  }

  startPositionBatching()
  emitToRoom(OPENF1_EVENTS.SESSION, { active: true, trackName, sessionType: "Demo" })
  emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(drivers.values()))

  // Emit the best available track path (MultiViewer preferred, GPS fallback).
  const displayPath = getDisplayPath()
  if (displayPath && displayPath.length > 0) {
    emitToRoom(OPENF1_EVENTS.TRACKMAP, {
      trackName,
      path: displayPath,
      pathVersion: activeSession.totalLapsProcessed,
      totalLapsProcessed: activeSession.totalLapsProcessed,
    })
  }
}

// Cleans up a demo session and notifies the frontend.
export const endDemoSession = (): void => {
  stopPositionBatching()
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "" })
  activeSession = null
}

// ─── MQTT Message Routing ────────────────────────────────────────

// Routes an incoming MQTT message to the appropriate handler based on topic.
export const handleMqttMessage = (topic: string, payload: Buffer): void => {
  try {
    const data = JSON.parse(payload.toString())

    switch (topic) {
      case "v1/sessions":
        handleSessionMessage(data as OpenF1SessionMsg)
        break
      case "v1/location":
        handleLocationMessage(data as OpenF1LocationMsg)
        break
      case "v1/laps":
        handleLapMessage(data as OpenF1LapMsg)
        break
      case "v1/drivers":
        handleDriverMessage(data as OpenF1DriverMsg)
        break
    }
  } catch (err) {
    console.error(`✗ Failed to parse MQTT message on ${topic}:`, err)
  }
}

// ─── Session Detection ───────────────────────────────────────────

// Handles a session status message from OpenF1.
// Detects session starts and ends, initializes data collection.
const handleSessionMessage = async (msg: OpenF1SessionMsg): Promise<void> => {
  // If we already have an active session for this session_key, ignore duplicate.
  if (activeSession && activeSession.sessionKey === msg.session_key) {
    // Check if session has ended.
    if (msg.status === "Finalised" || msg.status === "Ended") {
      await endSession()
    }
    return
  }

  // New session detected — only start tracking for active statuses.
  if (msg.status === "Started" || msg.status === "Active") {
    await startSession(msg)
  }
}

// Starts tracking a new session.
const startSession = async (msg: OpenF1SessionMsg): Promise<void> => {
  console.log(`🏎️  New session detected: ${msg.session_name} (key: ${msg.session_key})`)

  // Fetch meeting info for the track name and circuit key.
  let trackName = msg.circuit_short_name || "Unknown"
  let circuitKey: number | null = msg.circuit_key ?? null
  try {
    const token = await getOpenF1Token()
    const meetingRes = await axios.get<OpenF1Meeting[]>(
      `${OPENF1_API_BASE}/meetings?meeting_key=${msg.meeting_key}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (meetingRes.data.length > 0) {
      trackName = meetingRes.data[0].circuit_short_name || meetingRes.data[0].meeting_name
      circuitKey = meetingRes.data[0].circuit_key ?? circuitKey
    }
  } catch (err) {
    console.error("⚠ Failed to fetch meeting info, using fallback track name:", err)
  }

  // Fetch driver list for this session.
  const drivers = new Map<number, DriverInfo>()
  try {
    const token = await getOpenF1Token()
    const driversRes = await axios.get<OpenF1DriverMsg[]>(
      `${OPENF1_API_BASE}/drivers?session_key=${msg.session_key}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    driversRes.data.forEach((d: OpenF1DriverMsg) => {
      drivers.set(d.driver_number, {
        driverNumber: d.driver_number,
        nameAcronym: d.name_acronym,
        fullName: d.full_name,
        teamName: d.team_name,
        teamColour: d.team_colour,
      })
    })
  } catch (err) {
    console.error("⚠ Failed to fetch drivers for session:", err)
  }

  // Load existing track map from MongoDB.
  let baselinePath: { x: number; y: number }[] | null = null
  let multiviewerPath: { x: number; y: number }[] | null = null
  let totalLapsProcessed = 0
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      totalLapsProcessed = existing.totalLapsProcessed
      console.log(`✓ Loaded existing track map for "${trackName}" (${existing.path.length} points, ${totalLapsProcessed} laps)`)

      // Load cached MultiViewer outline if available.
      if (existing.multiviewerPath && existing.multiviewerPath.length > 0) {
        multiviewerPath = existing.multiviewerPath.map((p) => ({ x: p.x, y: p.y }))
        console.log(`✓ Loaded cached MultiViewer outline for "${trackName}" (${existing.multiviewerPath.length} points)`)
      }
    } else {
      console.log(`ℹ No existing track map for "${trackName}" — will generate from live data`)
    }
  } catch (err) {
    console.error("⚠ Failed to load track map from DB:", err)
  }

  // Initialize session state.
  activeSession = {
    sessionKey: msg.session_key,
    meetingKey: msg.meeting_key,
    trackName,
    sessionType: msg.session_type || msg.session_name,
    drivers,
    positionsByDriverLap: new Map(),
    currentPositions: new Map(),
    currentLapByDriver: new Map(),
    completedLaps: new Map(),
    bestLapTime: 0,
    totalLapsProcessed,
    lastUpdateLap: totalLapsProcessed,
    baselinePath,
    multiviewerPath,
  }

  // Try to fetch MultiViewer outline if not cached.
  if (!activeSession.multiviewerPath) {
    await tryFetchMultiviewer(circuitKey, trackName)
  }

  // Start batched position emission.
  startPositionBatching()

  // Emit session start to all subscribers.
  emitToRoom(OPENF1_EVENTS.SESSION, {
    active: true,
    trackName,
    sessionType: activeSession.sessionType,
  })

  // Emit driver info.
  emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(drivers.values()))

  // Emit the best available track path (MultiViewer preferred, GPS fallback).
  const displayPath = getDisplayPath()
  if (displayPath && displayPath.length > 0) {
    emitToRoom(OPENF1_EVENTS.TRACKMAP, {
      trackName,
      path: displayPath,
      pathVersion: totalLapsProcessed,
      totalLapsProcessed,
    })
  }
}

// Ends the current session and persists the final track map.
const endSession = async (): Promise<void> => {
  if (!activeSession) return

  console.log(`🏁 Session ended: ${activeSession.trackName}`)

  // Save final track map to MongoDB.
  await saveTrackMap()

  // Stop position batching.
  stopPositionBatching()

  // Notify frontend.
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "" })

  activeSession = null
}

// ─── Position Data ───────────────────────────────────────────────

// Handles a location message (car position update).
const handleLocationMessage = (msg: OpenF1LocationMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  // Update the driver's current position.
  activeSession.currentPositions.set(msg.driver_number, { x: msg.x, y: msg.y })

  // Store position in the per-driver-per-lap history.
  const currentLap = activeSession.currentLapByDriver.get(msg.driver_number) || 1

  if (!activeSession.positionsByDriverLap.has(msg.driver_number)) {
    activeSession.positionsByDriverLap.set(msg.driver_number, new Map())
  }

  const driverLaps = activeSession.positionsByDriverLap.get(msg.driver_number)!
  if (!driverLaps.has(currentLap)) {
    driverLaps.set(currentLap, [])
  }

  driverLaps.get(currentLap)!.push({ x: msg.x, y: msg.y, date: msg.date })
}

// ─── Lap Data ────────────────────────────────────────────────────

// Handles a lap message (lap completion notification).
const handleLapMessage = async (msg: OpenF1LapMsg): Promise<void> => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  // Update the driver's current lap number.
  activeSession.currentLapByDriver.set(msg.driver_number, msg.lap_number)

  // Store/update the lap data, keyed by driver+lap to deduplicate progressive MQTT updates.
  const lapKey = `${msg.driver_number}-${msg.lap_number}`
  activeSession.completedLaps.set(lapKey, msg)

  // Update best lap time.
  if (msg.lap_duration && msg.lap_duration > 0) {
    if (activeSession.bestLapTime === 0 || msg.lap_duration < activeSession.bestLapTime) {
      activeSession.bestLapTime = msg.lap_duration
    }
  }

  // Check if we should rebuild the track map.
  const allLaps = Array.from(activeSession.completedLaps.values())
  const fastLaps = filterFastLaps(allLaps, activeSession.bestLapTime)

  if (fastLaps.length > 0 && shouldUpdate(fastLaps.length, activeSession.lastUpdateLap)) {
    await rebuildTrackMap(fastLaps)
  }
}

// ─── Driver Data ─────────────────────────────────────────────────

// Handles a driver message (driver info update during session).
const handleDriverMessage = (msg: OpenF1DriverMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  const driverInfo: DriverInfo = {
    driverNumber: msg.driver_number,
    nameAcronym: msg.name_acronym,
    fullName: msg.full_name,
    teamName: msg.team_name,
    teamColour: msg.team_colour,
  }

  activeSession.drivers.set(msg.driver_number, driverInfo)

  // Emit updated driver list.
  emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(activeSession.drivers.values()))
}

// ─── Track Map Rebuilding ────────────────────────────────────────

// Rebuilds the track map from accumulated fast-lap position data.
const rebuildTrackMap = async (fastLaps: OpenF1LapMsg[]): Promise<void> => {
  if (!activeSession) return

  // Build validated laps with their position data.
  const validatedLaps: ValidatedLap[] = []

  for (const lap of fastLaps) {
    const driverLaps = activeSession.positionsByDriverLap.get(lap.driver_number)
    if (!driverLaps) continue

    const positions = driverLaps.get(lap.lap_number)
    if (!positions || positions.length === 0) continue

    validatedLaps.push({
      driverNumber: lap.driver_number,
      lapNumber: lap.lap_number,
      lapDuration: lap.lap_duration!,
      positions,
    })
  }

  if (validatedLaps.length === 0) return

  // Build the new track path.
  const newPath = buildTrackPath(validatedLaps)
  if (newPath.length === 0) return

  // If we had a baseline, check if the track layout has changed significantly.
  if (activeSession.baselinePath && activeSession.baselinePath.length > 0) {
    if (!hasTrackLayoutChanged(activeSession.baselinePath, newPath)) {
      // Track layout hasn't changed much — use the new refined path.
      console.log(`↻ Track map refined for "${activeSession.trackName}" (${validatedLaps.length} fast laps)`)
    } else {
      console.log(`⚠ Track layout change detected for "${activeSession.trackName}" — regenerating`)
    }
  } else {
    console.log(`✓ Initial track map generated for "${activeSession.trackName}" (${validatedLaps.length} fast laps)`)
  }

  // Update session state.
  activeSession.baselinePath = newPath
  activeSession.totalLapsProcessed = validatedLaps.length
  activeSession.lastUpdateLap = validatedLaps.length

  // Emit the best available track path. If we have a MultiViewer outline, keep using
  // it for display; the GPS path is still maintained as the reference for position mapping.
  const displayPath = getDisplayPath()
  emitToRoom(OPENF1_EVENTS.TRACKMAP, {
    trackName: activeSession.trackName,
    path: displayPath || newPath,
    pathVersion: validatedLaps.length,
    totalLapsProcessed: validatedLaps.length,
  })

  // Persist to MongoDB.
  await saveTrackMap()
}

// ─── Persistence ─────────────────────────────────────────────────

// Saves the current track map to MongoDB.
const saveTrackMap = async (): Promise<void> => {
  if (!activeSession || !activeSession.baselinePath || activeSession.baselinePath.length === 0) return

  try {
    const now = new Date().toISOString()
    const currentYear = new Date().getFullYear()

    const existing = await Trackmap.findOne({ trackName: activeSession.trackName })

    if (existing) {
      // Check if we need to archive the old version (different year).
      const lastUpdatedYear = existing.updated_at ? new Date(existing.updated_at).getFullYear() : currentYear

      if (lastUpdatedYear < currentYear && existing.path.length > 0) {
        // Archive the previous year's track map.
        existing.history.push({
          path: existing.path.map((p) => ({ x: p.x, y: p.y })),
          totalLapsProcessed: existing.totalLapsProcessed,
          year: lastUpdatedYear,
          archivedAt: now,
        })
        console.log(`📦 Archived ${activeSession.trackName} track map from ${lastUpdatedYear}`)
      }

      // Update with new data.
      existing.path = activeSession.baselinePath
      existing.pathVersion += 1
      existing.totalLapsProcessed = activeSession.totalLapsProcessed
      existing.latestSessionKey = activeSession.sessionKey

      if (!existing.meetingKeys.includes(activeSession.meetingKey)) {
        existing.meetingKeys.push(activeSession.meetingKey)
      }

      existing.updated_at = now
      await existing.save()
    } else {
      // Create new track map entry.
      await Trackmap.create({
        trackName: activeSession.trackName,
        previousTrackNames: [],
        meetingKeys: [activeSession.meetingKey],
        latestSessionKey: activeSession.sessionKey,
        path: activeSession.baselinePath,
        pathVersion: 1,
        totalLapsProcessed: activeSession.totalLapsProcessed,
        history: [],
        created_at: now,
        updated_at: now,
      })
      console.log(`✓ Saved new track map for "${activeSession.trackName}" to database`)
    }
  } catch (err) {
    console.error("✗ Failed to save track map to database:", err)
  }
}

// ─── MultiViewer Integration ─────────────────────────────────────

// Returns the best available display path: MultiViewer if available, GPS fallback otherwise.
const getDisplayPath = (): { x: number; y: number }[] | null => {
  if (!activeSession) return null
  return activeSession.multiviewerPath || activeSession.baselinePath
}

// Attempts to fetch a high-fidelity track outline from the MultiViewer API.
// Uses the shared circuit key (identical between OpenF1 and MultiViewer).
// On success, stores the path in the active session and caches it in MongoDB.
const tryFetchMultiviewer = async (circuitKey: number | null, trackName: string): Promise<void> => {
  if (!activeSession) return

  // No circuit key available — fall back to GPS-derived track.
  if (circuitKey === null) {
    console.log(`ℹ No circuit key for "${trackName}" — using GPS track`)
    return
  }

  try {
    const mvData = await fetchTrackOutline(circuitKey, new Date().getFullYear())
    if (!mvData || mvData.path.length === 0) {
      console.log(`ℹ MultiViewer returned no track data for "${trackName}" (key ${circuitKey}) — using GPS track`)
      return
    }

    activeSession.multiviewerPath = mvData.path
    console.log(`✓ Fetched MultiViewer track outline for "${trackName}" (${mvData.path.length} points)`)

    // Cache the MultiViewer data in MongoDB for future sessions.
    try {
      await Trackmap.updateOne(
        { trackName },
        {
          $set: {
            multiviewerPath: mvData.path,
            multiviewerCircuitKey: circuitKey,
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: false },
      )
    } catch (cacheErr) {
      console.error("⚠ Failed to cache MultiViewer data in MongoDB:", cacheErr)
    }
  } catch (err) {
    console.error("⚠ MultiViewer track fetch failed, using GPS fallback:", err)
  }
}

// ─── Position Batching ───────────────────────────────────────────

// Starts a timer that emits batched car positions to the frontend at ~10fps.
// When a MultiViewer track outline is active, car GPS positions are mapped
// through track progress so they align with the display path.
const startPositionBatching = (): void => {
  stopPositionBatching()

  positionBatchTimer = setInterval(() => {
    if (!activeSession || activeSession.currentPositions.size === 0) return

    // Determine coordinate mapping: if MultiViewer is active and we have a GPS
    // reference path, map car positions through track progress.
    const displayPath = activeSession.multiviewerPath
    const referencePath = activeSession.baselinePath
    const shouldMap = displayPath && referencePath && displayPath !== referencePath

    // Build the position payload.
    const positions: CarPositionPayload[] = []

    activeSession.currentPositions.forEach((pos, driverNumber) => {
      const driver = activeSession!.drivers.get(driverNumber)
      if (!driver) return

      let displayX = pos.x
      let displayY = pos.y

      // Map GPS coordinates to MultiViewer coordinates via track progress.
      if (shouldMap) {
        const progress = computeTrackProgress(pos.x, pos.y, referencePath)
        const mapped = mapProgressToPoint(progress, displayPath)
        displayX = mapped.x
        displayY = mapped.y
      }

      positions.push({
        driverNumber,
        x: displayX,
        y: displayY,
        nameAcronym: driver.nameAcronym,
        fullName: driver.fullName,
        teamName: driver.teamName,
        teamColour: driver.teamColour,
      })
    })

    if (positions.length > 0) {
      emitToRoom(OPENF1_EVENTS.POSITIONS, positions)
    }
  }, POSITION_BATCH_INTERVAL)
}

// Stops the position batching timer.
const stopPositionBatching = (): void => {
  if (positionBatchTimer) {
    clearInterval(positionBatchTimer)
    positionBatchTimer = null
  }
}

// ─── Socket.IO Emission ──────────────────────────────────────────

// Emits an event to all clients in the openf1:live room.
export const emitToRoom = (event: string, data: unknown): void => {
  if (ioServer) {
    ioServer.to(OPENF1_ROOM).emit(event, data)
  }
}

// ─── Startup Recovery ────────────────────────────────────────────

// Checks for any currently active session on startup (in case backend restarted mid-session).
export const checkForActiveSession = async (): Promise<void> => {
  try {
    const token = await getOpenF1Token()
    const sessionsRes = await axios.get<OpenF1SessionMsg[]>(
      `${OPENF1_API_BASE}/sessions?year=${new Date().getFullYear()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    // Find the most recent session that isn't finalised.
    const activeSessions = sessionsRes.data.filter(
      (s: OpenF1SessionMsg) => s.status === "Started" || s.status === "Active",
    )

    if (activeSessions.length > 0) {
      const latest = activeSessions[activeSessions.length - 1]
      console.log(`↻ Found active session on startup: ${latest.session_name}`)
      await startSession(latest)
    } else {
      console.log("ℹ No active OpenF1 session found on startup")
    }
  } catch (err) {
    console.error("⚠ Failed to check for active OpenF1 sessions on startup:", err)
  }
}
