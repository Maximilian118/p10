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
import { computeTrackProgress, mapProgressToPoint, computeArcLengths } from "./trackProgress"
import { computeSectorBoundaries } from "./sectorBoundaries"

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
            corners: activeSession.corners,
            sectorBoundaries: activeSession.sectorBoundaries,
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
    corners: null,
    sectorBoundaries: null,
    isDemo: true,
    baselineArcLengths: null,
    multiviewerArcLengths: null,
  }

  // Load existing trackmap from MongoDB so the track appears instantly.
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      activeSession.baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      activeSession.baselineArcLengths = computeArcLengths(activeSession.baselinePath)
      activeSession.totalLapsProcessed = existing.totalLapsProcessed
      activeSession.lastUpdateLap = existing.totalLapsProcessed
      console.log(`✓ Loaded existing track map for "${trackName}" (${existing.path.length} points, ${existing.totalLapsProcessed} laps)`)

      // Load cached MultiViewer outline if available.
      if (existing.multiviewerPath && existing.multiviewerPath.length > 0) {
        activeSession.multiviewerPath = existing.multiviewerPath.map((p) => ({ x: p.x, y: p.y }))
        activeSession.multiviewerArcLengths = computeArcLengths(activeSession.multiviewerPath)
        console.log(`✓ Loaded cached MultiViewer outline for "${trackName}" (${existing.multiviewerPath.length} points)`)
      }

      // Load cached corners and sector boundaries.
      if (existing.corners && existing.corners.length > 0) {
        activeSession.corners = existing.corners.map((c) => ({ number: c.number, trackPosition: { x: c.trackPosition.x, y: c.trackPosition.y } }))
      }
      if (existing.sectorBoundaries) {
        activeSession.sectorBoundaries = existing.sectorBoundaries
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
      corners: activeSession.corners,
      sectorBoundaries: activeSession.sectorBoundaries,
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
  let corners: { number: number; trackPosition: { x: number; y: number } }[] | null = null
  let sectorBoundaries: { startFinish: number; sector1_2: number; sector2_3: number } | null = null
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

      // Load cached corners and sector boundaries.
      if (existing.corners && existing.corners.length > 0) {
        corners = existing.corners.map((c) => ({ number: c.number, trackPosition: { x: c.trackPosition.x, y: c.trackPosition.y } }))
      }
      if (existing.sectorBoundaries) {
        sectorBoundaries = existing.sectorBoundaries
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
    corners,
    sectorBoundaries,
    isDemo: false,
    baselineArcLengths: baselinePath ? computeArcLengths(baselinePath) : null,
    multiviewerArcLengths: multiviewerPath ? computeArcLengths(multiviewerPath) : null,
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
      corners: activeSession.corners,
      sectorBoundaries: activeSession.sectorBoundaries,
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

  // Rebuild the track map incrementally (live sessions only).
  // Demo sessions skip this — buildTrackFromDemoData handles it in one batch.
  if (!activeSession.isDemo) {
    const allLaps = Array.from(activeSession.completedLaps.values())
    const fastLaps = filterFastLaps(allLaps, activeSession.bestLapTime)

    if (fastLaps.length > 0 && shouldUpdate(fastLaps.length, activeSession.lastUpdateLap)) {
      await rebuildTrackMap(fastLaps)
    }
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

  // Update session state and recompute arc-length cache for the new path.
  activeSession.baselinePath = newPath
  activeSession.baselineArcLengths = computeArcLengths(newPath)
  activeSession.totalLapsProcessed = validatedLaps.length
  activeSession.lastUpdateLap = validatedLaps.length

  // Attempt to compute sector boundaries if not yet determined.
  if (!activeSession.sectorBoundaries) {
    const allLaps = Array.from(activeSession.completedLaps.values())
    // Flatten positionsByDriverLap into a single positions array per driver.
    const flatPositions = new Map<number, { x: number; y: number; date: string }[]>()
    activeSession.positionsByDriverLap.forEach((lapMap, driverNum) => {
      const all: { x: number; y: number; date: string }[] = []
      lapMap.forEach((positions) => all.push(...positions))
      all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      flatPositions.set(driverNum, all)
    })
    const boundaries = computeSectorBoundaries(allLaps, flatPositions, newPath)
    if (boundaries) {
      activeSession.sectorBoundaries = boundaries
      console.log(`✓ Sector boundaries computed for "${activeSession.trackName}"`)
    }
  }

  // Emit the best available track path. If we have a MultiViewer outline, keep using
  // it for display; the GPS path is still maintained as the reference for position mapping.
  const displayPath = getDisplayPath()
  emitToRoom(OPENF1_EVENTS.TRACKMAP, {
    trackName: activeSession.trackName,
    path: displayPath || newPath,
    pathVersion: validatedLaps.length,
    totalLapsProcessed: validatedLaps.length,
    corners: activeSession.corners,
    sectorBoundaries: activeSession.sectorBoundaries,
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

      existing.sectorBoundaries = activeSession.sectorBoundaries || existing.sectorBoundaries
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
        sectorBoundaries: activeSession.sectorBoundaries,
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

// ─── Batch Track Building (Demo) ──────────────────────────────────

// Builds a GPS track from historical demo session data in one batch calculation.
// Extracts all v1/laps and v1/location messages, assigns positions to laps by
// time window, filters fast laps, and runs the standard track-building pipeline.
// Saves the result to MongoDB alongside the existing MultiViewer track (if any).
export const buildTrackFromDemoData = async (
  messages: { topic: string; data: unknown; timestamp: number }[],
  trackName: string,
  sessionKey: number,
): Promise<void> => {
  // Skip if the track already has a GPS path built from the SAME session.
  // Different sessions for the same circuit use different GPS coordinate systems,
  // so we must rebuild when the session key changes.
  const existing = await Trackmap.findOne({ trackName })
  if (existing && existing.latestSessionKey === sessionKey && existing.totalLapsProcessed >= 5) {
    console.log(`ℹ GPS track for "${trackName}" already built from session ${sessionKey} — skipping batch build`)
    return
  }

  // Extract all lap messages.
  const allLaps: OpenF1LapMsg[] = messages
    .filter((m) => m.topic === "v1/laps")
    .map((m) => m.data as OpenF1LapMsg)

  if (allLaps.length === 0) {
    console.log(`ℹ No lap data in demo messages for "${trackName}" — skipping batch build`)
    return
  }

  // Extract all location messages grouped by driver number.
  const positionsByDriver = new Map<number, { x: number; y: number; date: string }[]>()
  messages
    .filter((m) => m.topic === "v1/location")
    .forEach((m) => {
      const loc = m.data as OpenF1LocationMsg
      if (!positionsByDriver.has(loc.driver_number)) {
        positionsByDriver.set(loc.driver_number, [])
      }
      positionsByDriver.get(loc.driver_number)!.push({ x: loc.x, y: loc.y, date: loc.date })
    })

  // Sort each driver's positions chronologically.
  positionsByDriver.forEach((positions) => {
    positions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })

  // Compute best lap time for fast-lap filtering.
  let bestLapTime = 0
  allLaps.forEach((lap) => {
    if (lap.lap_duration && lap.lap_duration > 0) {
      if (bestLapTime === 0 || lap.lap_duration < bestLapTime) {
        bestLapTime = lap.lap_duration
      }
    }
  })

  // Filter to only fast, complete laps.
  const fastLaps = filterFastLaps(allLaps, bestLapTime)
  if (fastLaps.length === 0) {
    console.log(`ℹ No fast laps found in demo data for "${trackName}" — skipping batch build`)
    return
  }

  // Sort fast laps by driver and lap number for sequential time-window assignment.
  const lapsByDriver = new Map<number, OpenF1LapMsg[]>()
  fastLaps.forEach((lap) => {
    if (!lapsByDriver.has(lap.driver_number)) {
      lapsByDriver.set(lap.driver_number, [])
    }
    lapsByDriver.get(lap.driver_number)!.push(lap)
  })
  lapsByDriver.forEach((laps) => {
    laps.sort((a, b) => a.lap_number - b.lap_number)
  })

  // Build validated laps by assigning positions to each lap's time window.
  const validatedLaps: ValidatedLap[] = []

  lapsByDriver.forEach((laps, driverNumber) => {
    const driverPositions = positionsByDriver.get(driverNumber)
    if (!driverPositions || driverPositions.length === 0) return

    laps.forEach((lap) => {
      if (!lap.date_start || !lap.lap_duration) return

      // Compute the lap's time window.
      const lapStartMs = new Date(lap.date_start).getTime()
      const lapEndMs = lapStartMs + lap.lap_duration * 1000

      // Filter positions that fall within this lap's time window.
      const lapPositions = driverPositions.filter((p) => {
        const posMs = new Date(p.date).getTime()
        return posMs >= lapStartMs && posMs <= lapEndMs
      })

      // Require a minimum number of positions to form a useful lap trace.
      if (lapPositions.length < 10) return

      validatedLaps.push({
        driverNumber,
        lapNumber: lap.lap_number,
        lapDuration: lap.lap_duration,
        positions: lapPositions,
      })
    })
  })

  if (validatedLaps.length === 0) {
    console.log(`ℹ No validated laps with sufficient positions for "${trackName}" — skipping batch build`)
    return
  }

  // Run the standard track-building pipeline (outlier removal → best lap → downsample → smooth).
  const gpsPath = buildTrackPath(validatedLaps)
  if (gpsPath.length === 0) return

  // Compute sector boundaries from the demo data.
  const sectorBounds = computeSectorBoundaries(allLaps, positionsByDriver, gpsPath)
  if (sectorBounds) {
    console.log(`✓ Sector boundaries computed for "${trackName}" from demo data`)
  }

  // Save to MongoDB — upsert so it works whether or not a document already exists.
  const now = new Date().toISOString()
  if (existing) {
    existing.path = gpsPath
    existing.totalLapsProcessed = validatedLaps.length
    existing.latestSessionKey = sessionKey
    existing.pathVersion += 1
    existing.sectorBoundaries = sectorBounds || existing.sectorBoundaries
    existing.updated_at = now
    await existing.save()
  } else {
    await Trackmap.create({
      trackName,
      previousTrackNames: [],
      meetingKeys: [],
      latestSessionKey: sessionKey,
      path: gpsPath,
      pathVersion: 1,
      totalLapsProcessed: validatedLaps.length,
      sectorBoundaries: sectorBounds,
      history: [],
      created_at: now,
      updated_at: now,
    })
  }

  console.log(`✓ Built GPS track from demo data for "${trackName}" (${validatedLaps.length} laps, ${gpsPath.length} points)`)

  // Update the active session with sector boundaries and emit updated trackmap.
  if (activeSession && activeSession.trackName === trackName && sectorBounds) {
    activeSession.sectorBoundaries = sectorBounds
    const displayPath = getDisplayPath()
    if (displayPath && displayPath.length > 0) {
      emitToRoom(OPENF1_EVENTS.TRACKMAP, {
        trackName,
        path: displayPath,
        pathVersion: activeSession.totalLapsProcessed,
        totalLapsProcessed: activeSession.totalLapsProcessed,
        corners: activeSession.corners,
        sectorBoundaries: activeSession.sectorBoundaries,
      })
    }
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
    activeSession.multiviewerArcLengths = computeArcLengths(mvData.path)
    activeSession.corners = mvData.corners.length > 0 ? mvData.corners : null
    console.log(`✓ Fetched MultiViewer track outline for "${trackName}" (${mvData.path.length} points, ${mvData.corners.length} corners)`)

    // Cache the MultiViewer data in MongoDB for future sessions.
    try {
      await Trackmap.updateOne(
        { trackName },
        {
          $set: {
            multiviewerPath: mvData.path,
            multiviewerCircuitKey: circuitKey,
            corners: mvData.corners || [],
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

    // Pre-cached arc-length tables for the hot path.
    const baselineArc = activeSession.baselineArcLengths || undefined
    const multiviewerArc = activeSession.multiviewerArcLengths || undefined

    // Build the position payload.
    const positions: CarPositionPayload[] = []

    activeSession.currentPositions.forEach((pos, driverNumber) => {
      const driver = activeSession!.drivers.get(driverNumber)
      if (!driver) return

      let displayX = pos.x
      let displayY = pos.y
      let progress: number | undefined

      // Map GPS coordinates to MultiViewer coordinates via arc-length track progress.
      if (shouldMap) {
        progress = computeTrackProgress(pos.x, pos.y, referencePath, baselineArc)
        const mapped = mapProgressToPoint(progress, displayPath, multiviewerArc)
        displayX = mapped.x
        displayY = mapped.y
      }

      positions.push({
        driverNumber,
        x: displayX,
        y: displayY,
        ...(progress !== undefined && { progress }),
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
