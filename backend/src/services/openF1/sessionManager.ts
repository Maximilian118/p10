import { Server } from "socket.io"
import axios from "axios"
import Trackmap from "../../models/trackmap"
import Driver from "../../models/driver"
import { getOpenF1Token } from "./auth"
import {
  OpenF1LocationMsg,
  OpenF1LapMsg,
  OpenF1SessionMsg,
  OpenF1DriverMsg,
  OpenF1CarDataMsg,
  OpenF1IntervalMsg,
  OpenF1PitMsg,
  OpenF1StintMsg,
  OpenF1PositionMsg,
  OpenF1RaceControlMsg,
  OpenF1WeatherMsg,
  OpenF1OvertakeMsg,
  OpenF1Meeting,
  SessionState,
  DriverInfo,
  DriverLiveState,
  CarPositionPayload,
  ValidatedLap,
} from "./types"
import { buildTrackPath, filterFastLaps, shouldUpdate, hasTrackLayoutChanged } from "./trackmapBuilder"
import { fetchTrackOutline } from "./multiviewerClient"
import { computeTrackProgress, mapProgressToPoint, computeArcLengths } from "./trackProgress"
import { computeSectorBoundaries } from "./sectorBoundaries"
import { startPolling, stopPolling, markMqttReceived, onPolledMessage, getPollingStatus } from "./restPoller"
import { saveF1Session } from "../../models/f1Session"
import { connectLiveTiming, disconnectLiveTiming, getLatestClock, getLiveTimingStatus } from "./f1LiveTiming"
import { isMqttConnected, getSubscribedTopics } from "./mqttClient"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")
const mvLog = createLogger("MultiViewer")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Minimum interval between position batch emissions (ms).
const POSITION_BATCH_INTERVAL = 100

// Interval between aggregated driver state emissions (ms).
const DRIVER_STATE_BATCH_INTERVAL = 1000

// Socket.IO event names for OpenF1 data.
export const OPENF1_EVENTS = {
  TRACKMAP: "openf1:trackmap",
  POSITIONS: "openf1:positions",
  SESSION: "openf1:session",
  DRIVERS: "openf1:drivers",
  DRIVER_STATES: "openf1:driver-states",
  SESSION_STATE: "openf1:session-state",
  RACE_CONTROL: "openf1:race-control",
  DEMO_STATUS: "openf1:demo-status",
  CLOCK: "session:clock",
  SUBSCRIBE: "openf1:subscribe",
  UNSUBSCRIBE: "openf1:unsubscribe",
  LIVE_SESSION: "f1:live-session",
} as const

// Current active session state (null when no session is active).
let activeSession: SessionState | null = null

// Socket.IO server reference for emitting events.
let ioServer: Server | null = null

// Timer for batched position emissions.
let positionBatchTimer: ReturnType<typeof setInterval> | null = null

// Timer for aggregated driver state emissions.
let driverStateBatchTimer: ReturnType<typeof setInterval> | null = null

// Timer for fallback countdown clock (activates when SignalR is unavailable).
let fallbackClockTimer: ReturnType<typeof setInterval> | null = null

// Timer for periodic session polling (catches sessions missed by MQTT).
let sessionPollTimer: ReturnType<typeof setInterval> | null = null

// Interval between periodic session polls (ms).
const SESSION_POLL_INTERVAL = 60_000

// Room name for clients receiving OpenF1 live data.
const OPENF1_ROOM = "openf1:live"

// Delay before emitting the capability report (ms).
// Slightly longer than the MQTT grace period so REST polling decisions are finalized.
const CAPABILITY_REPORT_DELAY = 17000

// ─── Initialization ──────────────────────────────────────────────

// Initializes the session manager with a Socket.IO server reference.
// Registers client subscribe/unsubscribe handlers for the openf1:live room.
export const initSessionManager = (io: Server): void => {
  ioServer = io

  // Register room management and live session status for all clients.
  io.on("connection", (socket) => {
    // Send current live session status to every connecting client (for nav button).
    socket.emit(OPENF1_EVENTS.LIVE_SESSION, getActiveSessionInfo())

    socket.on(OPENF1_EVENTS.SUBSCRIBE, () => {
      socket.join(OPENF1_ROOM)
      // Send current session state and track map to the new subscriber.
      if (activeSession) {
        socket.emit(OPENF1_EVENTS.SESSION, {
          active: true,
          trackName: activeSession.trackName,
          sessionType: activeSession.sessionType,
          sessionName: activeSession.sessionName,
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
        // Send current driver live states snapshot.
        const driverStates = buildDriverStates()
        if (driverStates.length > 0) {
          socket.emit(OPENF1_EVENTS.DRIVER_STATES, driverStates)
        }
        // Send current session-wide state (weather, race control, overtakes).
        socket.emit(OPENF1_EVENTS.SESSION_STATE, {
          weather: activeSession.weather,
          raceControlMessages: activeSession.raceControlMessages,
          overtakes: activeSession.overtakes,
        })
        // Send latest clock state if available.
        const clock = getLatestClock()
        if (clock) {
          socket.emit(OPENF1_EVENTS.CLOCK, clock)
        }
      } else {
        socket.emit(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "", sessionName: "" })
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
    sessionName: "Demo",
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
    driverPositions: new Map(),
    driverIntervals: new Map(),
    driverStints: new Map(),
    driverPitStops: new Map(),
    driverCarData: new Map(),
    driverBestLap: new Map(),
    weather: null,
    raceControlMessages: [],
    overtakes: [],
    dateEndTs: 0,
  }

  // Load existing trackmap from MongoDB so the track appears instantly.
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      activeSession.baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      activeSession.baselineArcLengths = computeArcLengths(activeSession.baselinePath)
      activeSession.totalLapsProcessed = existing.totalLapsProcessed
      activeSession.lastUpdateLap = existing.totalLapsProcessed
      log.info(`✓ Loaded existing track map for "${trackName}" (${existing.path.length} points, ${existing.totalLapsProcessed} laps)`)

      // Load cached MultiViewer outline if available.
      if (existing.multiviewerPath && existing.multiviewerPath.length > 0) {
        activeSession.multiviewerPath = existing.multiviewerPath.map((p) => ({ x: p.x, y: p.y }))
        activeSession.multiviewerArcLengths = computeArcLengths(activeSession.multiviewerPath)
        mvLog.info(`✓ Loaded cached MultiViewer outline for "${trackName}" (${existing.multiviewerPath.length} points)`)
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
    log.error("⚠ Failed to load track map for demo:", err)
  }

  // Try to fetch MultiViewer outline if not cached.
  if (!activeSession.multiviewerPath) {
    await tryFetchMultiviewer(circuitKey, trackName)
  }

  startPositionBatching()
  startDriverStateBatching()
  emitToRoom(OPENF1_EVENTS.SESSION, { active: true, trackName, sessionType: "Demo", sessionName: "Demo" })
  emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(drivers.values()))
}

// Emits the current trackmap to all clients. Called after fast-forward
// processing in startDemoReplay() so data is ready when the spinner stops.
export const emitDemoTrackmap = (): void => {
  if (!activeSession) return
  const displayPath = getDisplayPath()
  if (displayPath && displayPath.length > 0) {
    emitToRoom(OPENF1_EVENTS.TRACKMAP, {
      trackName: activeSession.trackName,
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
  stopDriverStateBatching()
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "", sessionName: "" })
  activeSession = null
}

// ─── MQTT Message Routing ────────────────────────────────────────

// Routes an incoming MQTT message to the appropriate handler based on topic.
export const handleMqttMessage = (topic: string, payload: Buffer): void => {
  try {
    const data = JSON.parse(payload.toString())
    routeMessage(topic, data)
  } catch (err) {
    log.error(`✗ Failed to parse MQTT message on ${topic}:`, err)
  }
}

// Routes a parsed message (from MQTT or REST poller) to the appropriate handler.
const routeMessage = (topic: string, data: unknown): void => {
  // Notify the REST poller that this topic is active on MQTT.
  markMqttReceived(topic)

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
    case "v1/car_data":
      handleCarDataMessage(data as OpenF1CarDataMsg)
      break
    case "v1/intervals":
      handleIntervalMessage(data as OpenF1IntervalMsg)
      break
    case "v1/pit":
      handlePitMessage(data as OpenF1PitMsg)
      break
    case "v1/stints":
      handleStintMessage(data as OpenF1StintMsg)
      break
    case "v1/position":
      handlePositionMessage(data as OpenF1PositionMsg)
      break
    case "v1/race_control":
      handleRaceControlMessage(data as OpenF1RaceControlMsg)
      break
    case "v1/weather":
      handleWeatherMessage(data as OpenF1WeatherMsg)
      break
    case "v1/overtakes":
      handleOvertakeMessage(data as OpenF1OvertakeMsg)
      break
  }
}

// ─── Session Detection ───────────────────────────────────────────

// Handles a session status message from OpenF1.
// Detects session starts and ends, initializes data collection.
const handleSessionMessage = async (msg: OpenF1SessionMsg): Promise<void> => {
  // If we already have an active session for this session_key, ignore duplicate.
  if (activeSession && activeSession.sessionKey === msg.session_key) {
    // Check if session has ended based on time.
    if (msg.date_end && Date.now() > new Date(msg.date_end).getTime()) {
      await endSession()
    }
    return
  }

  // Determine if this session is currently in progress based on time window.
  const now = Date.now()
  const start = msg.date_start ? new Date(msg.date_start).getTime() : 0
  const end = msg.date_end ? new Date(msg.date_end).getTime() : 0
  const isInProgress = msg.date_start && msg.date_end && now >= start && now <= end

  if (isInProgress) {
    await startSession(msg)
  }
}

// Starts tracking a new session.
const startSession = async (msg: OpenF1SessionMsg): Promise<void> => {
  log.info(`🏎️ New session detected: ${msg.session_name} (key: ${msg.session_key})`)

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
    log.error("⚠ Failed to fetch meeting info, using fallback track name:", err)
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
        headshotUrl: d.headshot_url || null,
      })
    })

    // If some drivers have null fields, try meeting-level query as fallback.
    // Other sessions in the same meeting (e.g. Day 1, Day 2) may have full data.
    const nullCount = Array.from(drivers.values()).filter((d) => !d.nameAcronym).length
    if (nullCount > 0) {
      log.info(`${nullCount}/${drivers.size} drivers missing data — trying meeting-level query (meeting_key=${msg.meeting_key})`)
      const meetingRes = await axios.get<OpenF1DriverMsg[]>(
        `${OPENF1_API_BASE}/drivers?meeting_key=${msg.meeting_key}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      let filled = 0
      meetingRes.data.forEach((d: OpenF1DriverMsg) => {
        if (!d.name_acronym) return
        const existing = drivers.get(d.driver_number)
        if (existing && !existing.nameAcronym) {
          drivers.set(d.driver_number, {
            driverNumber: d.driver_number,
            nameAcronym: d.name_acronym,
            fullName: d.full_name,
            teamName: d.team_name,
            teamColour: d.team_colour,
            headshotUrl: d.headshot_url || null,
          })
          filled++
        }
      })
      log.info(`Meeting-level query: ${meetingRes.data.length} records, filled ${filled}/${nullCount} missing drivers`)
    }

    // Log final driver data summary.
    const complete = Array.from(drivers.values()).filter((d) => d.nameAcronym).length
    log.info(`Fetched ${drivers.size} drivers (${complete} with full data, ${drivers.size - complete} incomplete)`)

    // Cross-reference OpenF1 drivers with DB drivers by matching nameAcronym to driverID.
    // Updates DB driver numbers and uses DB icon as headshot fallback (level 3).
    const acronyms = Array.from(drivers.values())
      .filter((d) => d.nameAcronym)
      .map((d) => d.nameAcronym)
    if (acronyms.length > 0) {
      const dbDrivers = await Driver.find({ driverID: { $in: acronyms } })
      const dbDriverMap = new Map<string, typeof dbDrivers[number]>(dbDrivers.map((d) => [d.driverID, d]))
      let numberUpdates = 0
      let iconFallbacks = 0

      for (const [driverNumber, info] of drivers) {
        if (!info.nameAcronym) continue
        const dbDriver = dbDriverMap.get(info.nameAcronym)
        if (!dbDriver) continue

        // Auto-populate driver number on DB document if changed.
        if (dbDriver.driverNumber !== driverNumber) {
          if (dbDriver.driverNumber != null) {
            dbDriver.driverNumberHistory = [...(dbDriver.driverNumberHistory || []), dbDriver.driverNumber]
          }
          dbDriver.driverNumber = driverNumber
          await dbDriver.save()
          numberUpdates++
        }

        // Fallback level 3: use DB driver icon when OpenF1 has no headshot
        // (levels 1-2 are session_key and meeting_key queries above).
        if (!info.headshotUrl && dbDriver.icon) {
          info.headshotUrl = dbDriver.icon
          iconFallbacks++
        }
      }

      log.info(`DB cross-ref: ${dbDrivers.length} matched, ${numberUpdates} numbers updated, ${iconFallbacks} icon fallbacks`)
    }
  } catch (err) {
    log.error("⚠ Failed to fetch drivers for session:", err)
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
      log.info(`✓ Loaded existing track map for "${trackName}" (${existing.path.length} points, ${totalLapsProcessed} laps)`)

      // Load cached MultiViewer outline if available.
      if (existing.multiviewerPath && existing.multiviewerPath.length > 0) {
        multiviewerPath = existing.multiviewerPath.map((p) => ({ x: p.x, y: p.y }))
        mvLog.info(`✓ Loaded cached MultiViewer outline for "${trackName}" (${existing.multiviewerPath.length} points)`)
      }

      // Load cached corners and sector boundaries.
      if (existing.corners && existing.corners.length > 0) {
        corners = existing.corners.map((c) => ({ number: c.number, trackPosition: { x: c.trackPosition.x, y: c.trackPosition.y } }))
      }
      if (existing.sectorBoundaries) {
        sectorBoundaries = existing.sectorBoundaries
      }
    } else {
      log.info(`ℹ No existing track map for "${trackName}" — will generate from live data`)
    }
  } catch (err) {
    log.error("⚠ Failed to load track map from DB:", err)
  }

  // Initialize session state.
  activeSession = {
    sessionKey: msg.session_key,
    meetingKey: msg.meeting_key,
    trackName,
    sessionType: msg.session_type || msg.session_name,
    sessionName: msg.session_name,
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
    driverPositions: new Map(),
    driverIntervals: new Map(),
    driverStints: new Map(),
    driverPitStops: new Map(),
    driverCarData: new Map(),
    driverBestLap: new Map(),
    weather: null,
    raceControlMessages: [],
    overtakes: [],
    dateEndTs: msg.date_end ? new Date(msg.date_end).getTime() : 0,
  }

  // Try to fetch MultiViewer outline if not cached.
  if (!activeSession.multiviewerPath) {
    await tryFetchMultiviewer(circuitKey, trackName)
  }

  // Start batched emissions, REST polling fallback, and live timing clock.
  startPositionBatching()
  startDriverStateBatching()
  onPolledMessage((topic, data) => routeMessage(topic, data))
  startPolling(msg.session_key)
  connectLiveTiming()
  startFallbackClock()

  // Schedule the consolidated capability report after all data sources have settled.
  const reportSessionKey = activeSession.sessionKey
  setTimeout(() => logSessionReport(reportSessionKey), CAPABILITY_REPORT_DELAY)

  // Emit session start to all subscribers.
  emitToRoom(OPENF1_EVENTS.SESSION, {
    active: true,
    trackName,
    sessionType: activeSession.sessionType,
    sessionName: activeSession.sessionName,
  })

  // Broadcast live session status to all connected clients (nav button).
  broadcastLiveSession()

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

// Emits a consolidated session capability report showing the status of all data sources.
// Runs after the MQTT grace period so all connection statuses have settled.
const logSessionReport = (expectedSessionKey: number): void => {
  // Guard: session may have ended or changed before the report fires.
  if (!activeSession || activeSession.sessionKey !== expectedSessionKey) return

  const mqttConnected = isMqttConnected()
  const subscribed = getSubscribedTopics()
  const { mqttActive, restPolling, eventBased } = getPollingStatus()
  const liveTiming = getLiveTimingStatus()
  const hasMultiviewer = !!activeSession.multiviewerPath
  const hasGpsTrack = !!activeSession.baselinePath

  const divider = "=".repeat(56)
  const separator = "\u2500".repeat(56)

  const lines: string[] = [
    "",
    divider,
    ` SESSION: ${activeSession.sessionName} @ ${activeSession.trackName}`,
    ` Drivers: ${activeSession.drivers.size} | Key: ${activeSession.sessionKey}`,
    separator,
  ]

  // MQTT status.
  if (mqttConnected) {
    lines.push(` MQTT: Connected (${subscribed.size} subscriptions)`)
    if (mqttActive.length > 0) {
      lines.push(`   Delivering: ${mqttActive.join(", ")}`)
    }
  } else {
    lines.push(` MQTT: Disconnected`)
  }

  // REST polling fallback.
  if (restPolling.length > 0) {
    lines.push(` REST fallback: ${restPolling.join(", ")}`)
  }

  // Event-based topics that haven't received data yet (normal).
  if (eventBased.length > 0) {
    lines.push(` Awaiting events: ${eventBased.join(", ")}`)
  }

  // Live Timing (SignalR clock) status.
  if (liveTiming.status === "connected") {
    lines.push(` LiveTiming: Connected (ExtrapolatedClock)`)
  } else if (liveTiming.error) {
    lines.push(` LiveTiming: Unavailable (${liveTiming.error}) \u2014 using fallback clock`)
  } else {
    lines.push(` LiveTiming: Connecting...`)
  }

  // Track map source.
  if (hasMultiviewer) {
    lines.push(` Track map: MultiViewer outline`)
  } else if (hasGpsTrack) {
    lines.push(` Track map: GPS-derived (${activeSession.baselinePath!.length} points)`)
  } else {
    lines.push(` Track map: Pending (building from live data)`)
  }

  // Sector boundaries status.
  if (activeSession.sectorBoundaries) {
    const sb = activeSession.sectorBoundaries
    lines.push(` Sectors: Available (S/F: ${sb.startFinish.toFixed(3)}, S1/S2: ${sb.sector1_2.toFixed(3)}, S2/S3: ${sb.sector2_3.toFixed(3)})`)
  } else {
    // Show data counts to diagnose why sectors haven't been computed.
    const allLaps = Array.from(activeSession.completedLaps.values())
    const sectorLaps = allLaps.filter(
      (l) => l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3 && !l.is_pit_out_lap,
    ).length
    const driversWithGps = activeSession.positionsByDriverLap.size
    const hasRefPath = activeSession.baselinePath && activeSession.baselinePath.length >= 10
    lines.push(
      ` Sectors: Pending (${allLaps.length} laps, ${sectorLaps} with sectors, ${driversWithGps} drivers w/ GPS${hasRefPath ? "" : ", NO ref path"})`,
    )
  }

  // Corner labels status.
  if (activeSession.corners && activeSession.corners.length > 0) {
    lines.push(` Corners: ${activeSession.corners.length} labels from MultiViewer`)
  } else {
    lines.push(` Corners: None`)
  }

  // Driver data vs position data comparison.
  const posDrivers = activeSession.currentPositions.size
  const infoDrivers = activeSession.drivers.size
  lines.push(
    ` Drivers: ${infoDrivers} with info, ${posDrivers} with positions${posDrivers > infoDrivers ? ` (${posDrivers - infoDrivers} missing info!)` : ""}`,
  )

  lines.push(divider)
  lines.push("")

  // Emit each line through the logger as a single block.
  lines.forEach((line) => log.info(line))
}

// Ends the current session and persists the final track map and session data.
const endSession = async (): Promise<void> => {
  if (!activeSession) return

  log.info(`🏁 Session ended: ${activeSession.trackName}`)

  // Save final track map to MongoDB.
  await saveTrackMap()

  // Persist aggregated session data to MongoDB (30-day TTL).
  await saveF1Session(activeSession)

  // Stop all batching, polling, live timing connection, and fallback clock.
  stopPositionBatching()
  stopDriverStateBatching()
  stopPolling()
  disconnectLiveTiming()
  stopFallbackClock()

  // Notify subscribers and broadcast session end to all clients.
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "", sessionName: "" })
  broadcastLiveSession()

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

  // Log lap data state for diagnosing sector computation issues.
  log.verbose(`Lap: #${msg.driver_number} L${msg.lap_number} — sectors: ${msg.duration_sector_1 ? "S1" : "–"}/${msg.duration_sector_2 ? "S2" : "–"}/${msg.duration_sector_3 ? "S3" : "–"}, duration: ${msg.lap_duration || "–"}, pit-out: ${msg.is_pit_out_lap}`)

  // Update session best lap time.
  if (msg.lap_duration && msg.lap_duration > 0) {
    if (activeSession.bestLapTime === 0 || msg.lap_duration < activeSession.bestLapTime) {
      activeSession.bestLapTime = msg.lap_duration
    }

    // Update per-driver best lap time.
    const currentBest = activeSession.driverBestLap.get(msg.driver_number)
    if (!currentBest || msg.lap_duration < currentBest) {
      activeSession.driverBestLap.set(msg.driver_number, msg.lap_duration)
    }
  }

  // Rebuild the track map incrementally (live sessions only).
  // Demo sessions skip this — buildTrackFromDemoData handles it in one batch.
  if (!activeSession.isDemo) {
    const allLaps = Array.from(activeSession.completedLaps.values())
    const fastLaps = filterFastLaps(allLaps, activeSession.bestLapTime)

    // Log fast lap filtering result for sector pipeline diagnostics.
    log.verbose(`Laps: ${allLaps.length} total, ${fastLaps.length} fast, shouldUpdate: ${fastLaps.length > 0 && shouldUpdate(fastLaps.length, activeSession.lastUpdateLap)}`)

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
    headshotUrl: msg.headshot_url || null,
  }

  activeSession.drivers.set(msg.driver_number, driverInfo)

  // Log driver data arrival via MQTT for diagnostics.
  log.info(`Driver MQTT update: #${msg.driver_number} acronym=${msg.name_acronym}, name=${msg.full_name}, team=${msg.team_name}, colour=${msg.team_colour}, headshot=${msg.headshot_url ? "yes" : "null"}`)

  // Emit updated driver list.
  emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(activeSession.drivers.values()))
}

// ─── Car Data (Telemetry) ─────────────────────────────────────────

// Handles a car_data message (telemetry snapshot: speed, DRS, gear).
const handleCarDataMessage = (msg: OpenF1CarDataMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.driverCarData.set(msg.driver_number, {
    speed: msg.speed,
    drs: msg.drs,
    gear: msg.n_gear,
  })
}

// ─── Intervals ────────────────────────────────────────────────────

// Handles an interval message (gap to leader and interval to car ahead).
const handleIntervalMessage = (msg: OpenF1IntervalMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.driverIntervals.set(msg.driver_number, {
    gapToLeader: msg.gap_to_leader,
    interval: msg.interval,
  })
}

// ─── Pit Stops ────────────────────────────────────────────────────

// Handles a pit message (driver entered/exited pit lane).
const handlePitMessage = (msg: OpenF1PitMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  const existing = activeSession.driverPitStops.get(msg.driver_number)
  activeSession.driverPitStops.set(msg.driver_number, {
    count: (existing?.count ?? 0) + 1,
    lastDuration: msg.pit_duration,
    inPit: true,
  })

  // Mark driver as out of pits once the pit event has a duration (i.e. the stop is complete).
  // We'll rely on stint messages or position updates to clear the inPit flag more accurately.
}

// ─── Stints ───────────────────────────────────────────────────────

// Handles a stint message (tyre compound and stint tracking).
const handleStintMessage = (msg: OpenF1StintMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.driverStints.set(msg.driver_number, {
    compound: msg.compound,
    stintNumber: msg.stint_number,
    lapStart: msg.lap_start,
    tyreAgeAtStart: msg.tyre_age_at_start,
  })

  // A new stint means the driver has left the pits.
  const pitState = activeSession.driverPitStops.get(msg.driver_number)
  if (pitState) {
    pitState.inPit = false
  }
}

// ─── Race Position ────────────────────────────────────────────────

// Handles a position message (driver's race position update).
const handlePositionMessage = (msg: OpenF1PositionMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.driverPositions.set(msg.driver_number, msg.position)
}

// ─── Race Control ─────────────────────────────────────────────────

// Handles a race control message (flags, safety car, incidents).
const handleRaceControlMessage = (msg: OpenF1RaceControlMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  const event = {
    date: msg.date,
    category: msg.category,
    message: msg.message,
    flag: msg.flag,
    scope: msg.scope,
    sector: msg.sector,
    driverNumber: msg.driver_number,
    lapNumber: msg.lap_number,
  }

  activeSession.raceControlMessages.push(event)

  // Emit immediately for real-time display.
  emitToRoom(OPENF1_EVENTS.RACE_CONTROL, event)
}

// ─── Weather ──────────────────────────────────────────────────────

// Handles a weather message (track conditions update).
const handleWeatherMessage = (msg: OpenF1WeatherMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.weather = {
    airTemperature: msg.air_temperature,
    trackTemperature: msg.track_temperature,
    humidity: msg.humidity,
    rainfall: msg.rainfall > 0,
    windSpeed: msg.wind_speed,
    windDirection: msg.wind_direction,
    pressure: msg.pressure,
  }

  // Emit session state update immediately.
  emitToRoom(OPENF1_EVENTS.SESSION_STATE, {
    weather: activeSession.weather,
    raceControlMessages: activeSession.raceControlMessages,
    overtakes: activeSession.overtakes,
  })
}

// ─── Overtakes ────────────────────────────────────────────────────

// Handles an overtake message (position exchange event).
const handleOvertakeMessage = (msg: OpenF1OvertakeMsg): void => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  activeSession.overtakes.push({
    date: msg.date,
    overtakingDriverNumber: msg.overtaking_driver_number,
    overtakenDriverNumber: msg.overtaken_driver_number,
    position: msg.position,
  })
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

  // Log validated laps breakdown for sector pipeline diagnostics.
  log.verbose(`Rebuild: ${fastLaps.length} fast laps → ${validatedLaps.length} with GPS data`)

  if (validatedLaps.length === 0) return

  // Build the new track path.
  const newPath = buildTrackPath(validatedLaps)
  if (newPath.length === 0) return

  // If we had a baseline, check if the track layout has changed significantly.
  if (activeSession.baselinePath && activeSession.baselinePath.length > 0) {
    if (!hasTrackLayoutChanged(activeSession.baselinePath, newPath)) {
      // Track layout hasn't changed much — use the new refined path.
      log.info(`↻ Track map refined for "${activeSession.trackName}" (${validatedLaps.length} fast laps)`)
    } else {
      log.info(`⚠ Track layout change detected for "${activeSession.trackName}" — regenerating`)
    }
  } else {
    log.info(`✓ Initial track map generated for "${activeSession.trackName}" (${validatedLaps.length} fast laps)`)
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

    // Log sector computation attempt for diagnostics.
    log.info(`Attempting sector computation: ${allLaps.length} laps, ${flatPositions.size} drivers with GPS, refPath: ${newPath.length} points`)

    const boundaries = computeSectorBoundaries(allLaps, flatPositions, newPath)
    if (boundaries) {
      activeSession.sectorBoundaries = boundaries
      log.info(`✓ Sector boundaries computed for "${activeSession.trackName}"`)
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
        log.info(`📦 Archived ${activeSession.trackName} track map from ${lastUpdatedYear}`)
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
      // Create new track map entry (includes MultiViewer data if available).
      await Trackmap.create({
        trackName: activeSession.trackName,
        previousTrackNames: [],
        meetingKeys: [activeSession.meetingKey],
        latestSessionKey: activeSession.sessionKey,
        path: activeSession.baselinePath,
        multiviewerPath: activeSession.multiviewerPath || [],
        corners: activeSession.corners || [],
        pathVersion: 1,
        totalLapsProcessed: activeSession.totalLapsProcessed,
        sectorBoundaries: activeSession.sectorBoundaries,
        history: [],
        created_at: now,
        updated_at: now,
      })
      log.info(`✓ Saved new track map for "${activeSession.trackName}" to database`)
    }
  } catch (err) {
    log.error("✗ Failed to save track map to database:", err)
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
    log.info(`ℹ GPS track for "${trackName}" already built from session ${sessionKey} — skipping batch build`)
    return
  }

  // Extract all lap messages.
  const allLaps: OpenF1LapMsg[] = messages
    .filter((m) => m.topic === "v1/laps")
    .map((m) => m.data as OpenF1LapMsg)

  if (allLaps.length === 0) {
    log.info(`ℹ No lap data in demo messages for "${trackName}" — skipping batch build`)
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
    log.info(`ℹ No fast laps found in demo data for "${trackName}" — skipping batch build`)
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
    log.info(`ℹ No validated laps with sufficient positions for "${trackName}" — skipping batch build`)
    return
  }

  // Run the standard track-building pipeline (outlier removal → best lap → downsample → smooth).
  const gpsPath = buildTrackPath(validatedLaps)
  if (gpsPath.length === 0) return

  // Compute sector boundaries from the demo data.
  const sectorBounds = computeSectorBoundaries(allLaps, positionsByDriver, gpsPath)
  if (sectorBounds) {
    log.info(`✓ Sector boundaries computed for "${trackName}" from demo data`)
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

  log.info(`✓ Built GPS track from demo data for "${trackName}" (${validatedLaps.length} laps, ${gpsPath.length} points)`)

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
    log.info(`ℹ No circuit key for "${trackName}" — using GPS track`)
    return
  }

  try {
    const mvData = await fetchTrackOutline(circuitKey, new Date().getFullYear())
    if (!mvData || mvData.path.length === 0) {
      mvLog.info(`ℹ MultiViewer returned no track data for "${trackName}" (key ${circuitKey}) — using GPS track`)
      return
    }

    activeSession.multiviewerPath = mvData.path
    activeSession.multiviewerArcLengths = computeArcLengths(mvData.path)
    activeSession.corners = mvData.corners.length > 0 ? mvData.corners : null
    mvLog.info(`✓ Fetched MultiViewer track outline for "${trackName}" (${mvData.path.length} points, ${mvData.corners.length} corners)`)

    // Cache the MultiViewer data in MongoDB for future sessions.
    // Uses upsert so brand-new tracks get a document immediately.
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
          $setOnInsert: {
            created_at: new Date().toISOString(),
          },
        },
        { upsert: true },
      )
    } catch (cacheErr) {
      mvLog.error("⚠ Failed to cache MultiViewer data in MongoDB:", cacheErr)
    }
  } catch (err) {
    mvLog.error("⚠ MultiViewer track fetch failed, using GPS fallback:", err)
  }
}

// ─── Driver State Aggregation & Batching ─────────────────────────

// Builds an array of DriverLiveState snapshots from the current session state.
const buildDriverStates = (): DriverLiveState[] => {
  if (!activeSession) return []

  const states: DriverLiveState[] = []

  activeSession.drivers.forEach((driver, driverNumber) => {
    const currentLap = activeSession!.currentLapByDriver.get(driverNumber) || 0

    // Find the latest completed lap with timing data.
    const latestLapKey = `${driverNumber}-${currentLap > 0 ? currentLap - 1 : 0}`
    const prevLapKey = `${driverNumber}-${currentLap > 1 ? currentLap - 2 : 0}`
    const latestLap = activeSession!.completedLaps.get(latestLapKey) || activeSession!.completedLaps.get(prevLapKey)

    // Look up the current in-progress lap for live mini-sector segments.
    const currentLapKey = `${driverNumber}-${currentLap}`
    const currentLapData = activeSession!.completedLaps.get(currentLapKey)

    const intervalState = activeSession!.driverIntervals.get(driverNumber)
    const stintState = activeSession!.driverStints.get(driverNumber)
    const pitState = activeSession!.driverPitStops.get(driverNumber)
    const carData = activeSession!.driverCarData.get(driverNumber)
    const position = activeSession!.driverPositions.get(driverNumber) ?? null
    const bestLap = activeSession!.driverBestLap.get(driverNumber) ?? null

    // Calculate tyre age from stint data and current lap.
    const tyreAge = stintState
      ? Math.max(0, currentLap - stintState.lapStart) + stintState.tyreAgeAtStart
      : 0

    states.push({
      driverNumber,
      nameAcronym: driver.nameAcronym,
      fullName: driver.fullName,
      teamName: driver.teamName,
      teamColour: driver.teamColour,
      headshotUrl: driver.headshotUrl,

      position,
      gapToLeader: intervalState?.gapToLeader ?? null,
      interval: intervalState?.interval ?? null,

      currentLapNumber: currentLap,
      lastLapTime: latestLap?.lap_duration ?? null,
      bestLapTime: bestLap,

      sectorTimes: {
        s1: latestLap?.duration_sector_1 ?? null,
        s2: latestLap?.duration_sector_2 ?? null,
        s3: latestLap?.duration_sector_3 ?? null,
      },

      // Use current in-progress lap for live segment updates (progressively filled
      // as the car crosses each mini-sector). Falls back to empty when lap just started.
      segments: {
        sector1: currentLapData?.segments_sector_1 ?? [],
        sector2: currentLapData?.segments_sector_2 ?? [],
        sector3: currentLapData?.segments_sector_3 ?? [],
      },

      tyreCompound: stintState?.compound ?? null,
      tyreAge,
      inPit: pitState?.inPit ?? false,
      pitStops: pitState?.count ?? 0,
      isPitOutLap: latestLap?.is_pit_out_lap ?? false,

      speed: carData?.speed ?? 0,
      drs: carData?.drs ?? 0,
      gear: carData?.gear ?? 0,

      i1Speed: latestLap?.i1_speed ?? null,
      i2Speed: latestLap?.i2_speed ?? null,
      stSpeed: latestLap?.st_speed ?? null,
    })
  })

  return states
}

// Starts a timer that emits aggregated driver state snapshots every ~1s.
const startDriverStateBatching = (): void => {
  stopDriverStateBatching()

  driverStateBatchTimer = setInterval(() => {
    if (!activeSession || activeSession.drivers.size === 0) return

    const states = buildDriverStates()
    if (states.length > 0) {
      emitToRoom(OPENF1_EVENTS.DRIVER_STATES, states)
    }
  }, DRIVER_STATE_BATCH_INTERVAL)
}

// Stops the driver state batching timer.
const stopDriverStateBatching = (): void => {
  if (driverStateBatchTimer) {
    clearInterval(driverStateBatchTimer)
    driverStateBatchTimer = null
  }
}

// ─── Fallback Clock ──────────────────────────────────────────────

// How often the fallback clock emits (ms).
const FALLBACK_CLOCK_INTERVAL = 5000

// Maximum age of SignalR clock data before fallback activates (ms).
const SIGNALR_STALE_THRESHOLD = 15000

// Starts a periodic fallback clock that emits computed countdown events
// when the F1 Live Timing SignalR connection hasn't delivered data recently.
// Uses session date_end and race control flags to compute remaining time.
const startFallbackClock = (): void => {
  stopFallbackClock()

  fallbackClockTimer = setInterval(() => {
    if (!activeSession || activeSession.isDemo || !activeSession.dateEndTs) return

    // If SignalR has delivered a clock update recently, defer to it.
    const signalRClock = getLatestClock()
    if (signalRClock && (Date.now() - signalRClock.serverTs) < SIGNALR_STALE_THRESHOLD) return

    // Derive running state from the latest race control flag.
    const rcMessages = activeSession.raceControlMessages
    let running = true
    for (let i = rcMessages.length - 1; i >= 0; i--) {
      if (rcMessages[i].flag === "RED") { running = false; break }
      if (rcMessages[i].flag === "GREEN") break
    }

    // Compute remaining time from session date_end.
    const remainingMs = Math.max(0, activeSession.dateEndTs - Date.now())

    emitToRoom(OPENF1_EVENTS.CLOCK, {
      remainingMs,
      running,
      serverTs: Date.now(),
      speed: 1,
    })
  }, FALLBACK_CLOCK_INTERVAL)
}

// Stops the fallback clock timer.
const stopFallbackClock = (): void => {
  if (fallbackClockTimer) {
    clearInterval(fallbackClockTimer)
    fallbackClockTimer = null
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
    const missingDrivers: number[] = []

    activeSession.currentPositions.forEach((pos, driverNumber) => {
      const driver = activeSession!.drivers.get(driverNumber)
      if (!driver) {
        missingDrivers.push(driverNumber)
        return
      }

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

    // Log when positions are skipped due to missing driver info.
    if (missingDrivers.length > 0) {
      log.verbose(`Position batch: ${missingDrivers.length} drivers skipped (no info): ${missingDrivers.join(", ")}`)
    }

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

// Returns the current live session info for broadcasting to all clients.
export const getActiveSessionInfo = (): { active: boolean; sessionType: string; trackName: string } => {
  if (activeSession && !activeSession.isDemo) {
    return { active: true, sessionType: activeSession.sessionType, trackName: activeSession.trackName }
  }
  return { active: false, sessionType: "", trackName: "" }
}

// Broadcasts live session status to ALL connected clients (not just openf1:live room).
const broadcastLiveSession = (): void => {
  if (ioServer) {
    ioServer.emit(OPENF1_EVENTS.LIVE_SESSION, getActiveSessionInfo())
  }
}

// ─── Session Polling ─────────────────────────────────────────────

// Starts periodic polling for active sessions via REST API.
// Catches sessions that MQTT may have missed (e.g. broker reconnect timing).
export const startSessionPolling = (): void => {
  if (sessionPollTimer) return
  sessionPollTimer = setInterval(async () => {
    // If we have an active live session, check if its time window has passed.
    if (activeSession && !activeSession.isDemo) {
      if (activeSession.dateEndTs > 0 && Date.now() > activeSession.dateEndTs) {
        await endSession()
      }
      return
    }
    await checkForActiveSession()
  }, SESSION_POLL_INTERVAL)
}

// ─── Startup Recovery ────────────────────────────────────────────

// Checks for any currently active session (used on startup and by periodic polling).
export const checkForActiveSession = async (): Promise<void> => {
  try {
    const token = await getOpenF1Token()
    const sessionsRes = await axios.get<OpenF1SessionMsg[]>(
      `${OPENF1_API_BASE}/sessions?year=${new Date().getFullYear()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    // Find sessions that are currently in progress based on time window.
    const now = Date.now()
    const activeSessions = sessionsRes.data.filter((s: OpenF1SessionMsg) => {
      if (!s.date_start || !s.date_end) return false
      const start = new Date(s.date_start).getTime()
      const end = new Date(s.date_end).getTime()
      return now >= start && now <= end
    })

    if (activeSessions.length > 0) {
      const latest = activeSessions[activeSessions.length - 1]
      log.info(`↻ Found active session: ${latest.session_name}`)
      await startSession(latest)
    } else if (!activeSession) {
      log.info("ℹ No active session found")
    }
  } catch (err) {
    log.error("⚠ Failed to check for active sessions:", err)
  }
}
