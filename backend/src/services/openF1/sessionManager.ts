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
  OpenF1Meeting,
  SessionState,
  DriverInfo,
  DriverStintState,
  DriverLiveState,
  CarPositionPayload,
  ValidatedLap,
  RaceControlEvent,
  PitLaneProfile,
  DriverPitState,
  MAX_PIT_SAMPLES,
} from "./types"
import { computePitSideVote, buildProfileFromSamples, PIT_SPEED_MARGIN, MIN_PIT_PROGRESS_RANGE, computeInfieldSide } from "./pitLaneUtils"
import { buildTrackPath, filterFastLaps, shouldUpdate, hasTrackLayoutChanged } from "./trackmapBuilder"
import { fetchTrackOutline } from "./multiviewerClient"
import { computeTrackProgress, mapProgressToPoint, computeArcLengths, forwardDistance } from "./trackProgress"
import { computeSectorBoundaries } from "./sectorBoundaries"
import { startPolling, stopPolling, markMqttReceived, onPolledMessage, getPollingStatus } from "./openf1Client"
import { createF1Session, updateF1Session, finalizeF1Session, saveDemoSession, ReplayMessage } from "../../models/f1Session"
import { connectLiveTiming, disconnectLiveTiming, getLatestClock, getLiveTimingStatus, getSignalRTopicTimestamps } from "./signalrClient"
import { isMqttConnected, getSubscribedTopics } from "./openf1Client"
import { InternalEvent, normalizeOpenF1Message } from "./normalizer"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")
const mvLog = createLogger("MultiViewer")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Minimum interval between position batch emissions (ms).
const POSITION_BATCH_INTERVAL = 100

// Interval between aggregated driver state emissions (ms).
const DRIVER_STATE_BATCH_INTERVAL = 1000

// Default pit lane speed limit (km/h) — most F1 circuits use 80, street circuits use 60.
const DEFAULT_PIT_LANE_LIMIT = 80
// Margin above detected/default pit lane speed limit for exit threshold (km/h).
const FALLBACK_EXIT_MARGIN = 15

// Number of laps (relative to leader) a car must be stationary in pit before assuming DNF.
const PIT_TIMEOUT_LAPS = 2
// Speed threshold (km/h) below which a car on track is considered stationary.
const TRACK_STALL_SPEED = 5
// Number of leader laps a car must be stationary on track before assuming DNF.
const TRACK_STALL_LAPS = 1

// Returns true if the session type is a Race or Sprint (where timeout DNF detection applies).
const checkIsRaceSession = (sessionType: string): boolean => {
  const lower = sessionType.toLowerCase()
  return lower.includes("race") || lower === "sprint"
}

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

// Tracks when each driver's lap number last changed (real wall-clock time).
// Used by truncateDemoSegments() to detect stale GPS during lap transitions.
const driverLapTransitionTs = new Map<number, number>()

// Timer for fallback countdown clock (activates when SignalR is unavailable).
let fallbackClockTimer: ReturnType<typeof setInterval> | null = null

// Timer for progressive database persistence (flushes every 30s during live sessions).
let progressiveSaveTimer: ReturnType<typeof setInterval> | null = null

// Timer for periodic session polling (catches sessions missed by MQTT).
let sessionPollTimer: ReturnType<typeof setInterval> | null = null

// Interval between progressive database saves (ms).
const PROGRESSIVE_SAVE_INTERVAL = 30_000

// Minimum interval between weather snapshots (ms) — captures every 5 minutes.
const WEATHER_SNAPSHOT_INTERVAL = 5 * 60 * 1000

// Interval between periodic session polls (ms).
const SESSION_POLL_INTERVAL = 60_000

// Room name for clients receiving OpenF1 live data.
const OPENF1_ROOM = "openf1:live"

// Callback invoked when the openf1:live room becomes empty.
// Set by demoReplay to auto-stop the demo when no clients are watching.
let onRoomEmptyCallback: (() => void) | null = null
export const setOnRoomEmpty = (cb: (() => void) | null): void => {
  onRoomEmptyCallback = cb
}

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
        const trackmapPayload = buildTrackmapPayload()
        if (trackmapPayload) socket.emit(OPENF1_EVENTS.TRACKMAP, trackmapPayload)
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
      // Stop demo replay if this was the last viewer in the room.
      checkRoomEmpty()
    })

    // Handle socket disconnect (tab close, network drop, browser close).
    // Socket.io auto-removes the socket from all rooms on disconnect.
    socket.on("disconnect", () => {
      checkRoomEmpty()
    })
  })
}

// Checks if the openf1:live room is empty and invokes the room-empty callback.
const checkRoomEmpty = (): void => {
  if (!ioServer || !onRoomEmptyCallback) return
  const room = ioServer.sockets.adapter.rooms.get(OPENF1_ROOM)
  if (!room || room.size === 0) {
    onRoomEmptyCallback()
  }
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
  sessionType?: string,
): Promise<void> => {
  activeSession = {
    sessionKey,
    meetingKey: 0,
    trackName,
    sessionType: sessionType || "Demo",
    sessionName: sessionType || "Demo",
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
    displaySectorBoundaries: null,
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
    safetyCarPeriods: [],
    redFlagPeriods: [],
    dnfs: [],
    weatherHistory: [],
    totalLaps: null,
    _activeSC: null,
    _activeRedFlag: null,
    _lastWeatherSnapshot: 0,
    driverGridPositions: new Map(),
    driverStintHistory: new Map(),
    driverPitStopHistory: new Map(),
    teamRadio: [],
    sessionData: [],
    recordedMessages: [],
    isRecording: false,
    pitLaneProfile: null,
    pitExitObservations: [],
    pitLaneSpeeds: [],
    pitStopSamples: [],
    isRaceSession: checkIsRaceSession(sessionType || "Demo"),
    timeoutDNFDrivers: new Set(),
    trackStalls: new Map(),
    lastEmittedProgress: new Map(),
    rotationOverride: 0,
  }

  // Load existing trackmap from MongoDB so the track appears instantly.
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      activeSession.baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      // Snap last point to first so the path forms a zero-gap closed loop.
      if (activeSession.baselinePath.length > 1) {
        activeSession.baselinePath[activeSession.baselinePath.length - 1] = { ...activeSession.baselinePath[0] }
      }
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
      // Load cached pit lane profile.
      if (existing.pitLaneProfile) {
        activeSession.pitLaneProfile = existing.pitLaneProfile
        log.info(`✓ Loaded pit lane profile for "${trackName}" (${existing.pitLaneProfile.samplesCollected} samples, limit: ${existing.pitLaneProfile.pitLaneSpeedLimit} km/h)`)
      }
      // Load admin-set rotation override.
      activeSession.rotationOverride = existing.rotationOverride ?? 0
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
  const payload = buildTrackmapPayload()
  if (payload) emitToRoom(OPENF1_EVENTS.TRACKMAP, payload)
}

// Sets the pit lane profile on the active session (called by demoReplay after building it).
export const setActivePitLaneProfile = (profile: PitLaneProfile): void => {
  if (activeSession) {
    activeSession.pitLaneProfile = profile
    log.info(`✓ Pit lane profile set: entry=${profile.entryProgress.toFixed(3)}, exit=${profile.exitProgress.toFixed(3)}, side=${profile.pitSide > 0 ? "right" : "left"}, limit=${profile.pitLaneSpeedLimit} km/h (${profile.samplesCollected} samples)`)
  }
}

// Cleans up a demo session and notifies the frontend.
export const endDemoSession = (): void => {
  stopPositionBatching()
  stopDriverStateBatching()
  driverLapTransitionTs.clear()
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "", sessionName: "" })
  activeSession = null
}

// ─── Source Priority ──────────────────────────────────────────────

// SignalR topics that overlap with OpenF1. When SignalR has recently delivered
// data for a topic, OpenF1 data for the same type is skipped.
const SIGNALR_TOPIC_FOR_EVENT_TYPE: Record<string, string> = {
  stint: "TimingAppData",
  interval: "TimingData",
  weather: "WeatherData",
  race_control: "RaceControlMessages",
}

// How recently SignalR must have delivered data to suppress OpenF1 for that topic (ms).
const SIGNALR_FRESHNESS_THRESHOLD = 15000

// Returns true if SignalR has recently delivered data for the given event type.
const isSignalRFresh = (eventType: string): boolean => {
  const signalrTopic = SIGNALR_TOPIC_FOR_EVENT_TYPE[eventType]
  if (!signalrTopic) return false
  const lastSeen = getSignalRTopicTimestamps().get(signalrTopic)
  return !!lastSeen && (Date.now() - lastSeen) < SIGNALR_FRESHNESS_THRESHOLD
}

// ─── Normalized Event Handler ────────────────────────────────────

// Handles a normalized internal event from any source (SignalR, OpenF1, or demo).
// Applies source priority: SignalR data suppresses OpenF1 for overlapping topics.
export const handleEvent = (event: InternalEvent): void => {
  // For OpenF1 events on topics where SignalR is active, skip the update.
  if (event.source === "openf1" && isSignalRFresh(event.type)) return

  // Route to the appropriate handler based on event type.
  switch (event.type) {
    case "session":
      handleSessionEvent(event)
      break
    case "drivers":
      handleDriverEvent(event)
      break
    case "location":
      handleLocationEvent(event)
      break
    case "lap":
      handleLapEvent(event)
      break
    case "car_data":
      handleCarDataEvent(event)
      break
    case "interval":
      handleIntervalEvent(event)
      break
    case "pit":
      handlePitEvent(event)
      break
    case "stint":
      handleStintEvent(event)
      break
    case "position":
      handlePositionEvent(event)
      break
    case "race_control":
      handleRaceControlEvent(event)
      break
    case "weather":
      handleWeatherEvent(event)
      break
    case "overtake":
      handleOvertakeEvent(event)
      break
    case "clock":
      handleClockEvent(event)
      break
    case "lapcount":
      handleLapCountEvent(event)
      break
    case "team_radio":
      handleTeamRadioEvent(event)
      break
    case "session_data":
      handleSessionDataEvent(event)
      break
  }
}

// ─── Normalized Event Handlers ──────────────────────────────────

// Handles a normalized session event. Delegates to the existing async handler.
const handleSessionEvent = (event: InternalEvent): void => {
  const d = event.data
  const msg: OpenF1SessionMsg = {
    meeting_key: d.meetingKey as number,
    session_key: d.sessionKey as number,
    session_name: (d.sessionName as string) ?? "",
    session_type: (d.sessionType as string) ?? "",
    status: (d.status as string) ?? "",
    date_start: (d.dateStart as string) ?? null,
    date_end: (d.dateEnd as string) ?? null,
    circuit_short_name: (d.circuitShortName as string) ?? null,
    circuit_key: (d.circuitKey as number) ?? null,
    _key: "",
    _id: 0,
  }
  handleSessionMessage(msg)
}

// Handles a normalized driver event. Updates the session driver map.
const handleDriverEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data

  const driverInfo: DriverInfo = {
    driverNumber: event.driverNumber,
    nameAcronym: (d.nameAcronym as string) ?? "",
    fullName: (d.fullName as string) ?? "",
    teamName: (d.teamName as string) ?? "",
    teamColour: (d.teamColour as string) ?? "",
    headshotUrl: (d.headshotUrl as string) ?? null,
  }

  // Only update if we have meaningful data (avoid overwriting with empty strings from partial updates).
  if (driverInfo.nameAcronym || driverInfo.fullName) {
    activeSession.drivers.set(event.driverNumber, driverInfo)
    emitToRoom(OPENF1_EVENTS.DRIVERS, Array.from(activeSession.drivers.values()))
  }
}

// Handles a normalized location event (car GPS position).
const handleLocationEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data

  activeSession.currentPositions.set(event.driverNumber, {
    x: d.x as number,
    y: d.y as number,
  })

  // Accumulate GPS positions + speed during pit stays for pit side detection and tight boundary detection.
  const pitState = activeSession.driverPitStops.get(event.driverNumber)
  if (pitState?.inPit) {
    const currentSpeed = activeSession.driverCarData.get(event.driverNumber)?.speed ?? 0
    pitState.pitLanePositions.push({ x: d.x as number, y: d.y as number, speed: currentSpeed })
  }

  // Store position in the per-driver-per-lap history.
  const currentLap = activeSession.currentLapByDriver.get(event.driverNumber) || 1

  if (!activeSession.positionsByDriverLap.has(event.driverNumber)) {
    activeSession.positionsByDriverLap.set(event.driverNumber, new Map())
  }

  const driverLaps = activeSession.positionsByDriverLap.get(event.driverNumber)!
  if (!driverLaps.has(currentLap)) {
    driverLaps.set(currentLap, [])
  }

  driverLaps.get(currentLap)!.push({
    x: d.x as number,
    y: d.y as number,
    date: (d.date as string) ?? new Date(event.timestamp).toISOString(),
  })
}

// Handles a normalized lap event. Reconstructs the OpenF1LapMsg shape
// for storage in completedLaps (read by buildDriverStates and rebuildTrackMap).
const handleLapEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data

  const lapMsg: OpenF1LapMsg = {
    meeting_key: activeSession.meetingKey,
    session_key: activeSession.sessionKey,
    driver_number: event.driverNumber,
    lap_number: (d.lapNumber as number) ?? 0,
    lap_duration: (d.lapDuration as number) ?? null,
    duration_sector_1: (d.s1 as number) ?? null,
    duration_sector_2: (d.s2 as number) ?? null,
    duration_sector_3: (d.s3 as number) ?? null,
    is_pit_out_lap: (d.isPitOutLap as boolean) ?? false,
    i1_speed: (d.i1Speed as number) ?? null,
    i2_speed: (d.i2Speed as number) ?? null,
    st_speed: (d.stSpeed as number) ?? null,
    date_start: (d.dateStart as string) ?? null,
    segments_sector_1: (d.segmentsSector1 as number[]) ?? null,
    segments_sector_2: (d.segmentsSector2 as number[]) ?? null,
    segments_sector_3: (d.segmentsSector3 as number[]) ?? null,
    _key: "",
    _id: 0,
  }

  handleLapMessage(lapMsg)
}

// Detects the pit lane speed limit from observed pit lane speeds.
// Buckets speeds into 5 km/h bins and returns the center of the most populated bin.
const detectSpeedLimit = (speeds: number[]): number => {
  if (speeds.length === 0) return DEFAULT_PIT_LANE_LIMIT
  const binSize = 5
  const bins = new Map<number, number>()
  for (const s of speeds) {
    const bin = Math.round(s / binSize) * binSize
    bins.set(bin, (bins.get(bin) ?? 0) + 1)
  }
  let bestBin = DEFAULT_PIT_LANE_LIMIT
  let bestCount = 0
  bins.forEach((count, bin) => {
    if (count > bestCount) {
      bestCount = count
      bestBin = bin
    }
  })
  return bestBin
}

// Returns the speed threshold above which a car is considered to have left the pit lane.
// Uses a 4-tier cascade: full profile → partial profile → live detection → default.
const getPitExitThreshold = (session: SessionState): number => {
  const profile = session.pitLaneProfile
  // Full profile: use midpoint between pit lane max and exit speed.
  if (profile && profile.samplesCollected >= 3) {
    return (profile.pitLaneMaxSpeed + profile.exitSpeed) / 2
  }
  // Partial data: detected speed limit + margin.
  if (profile?.pitLaneSpeedLimit) {
    return profile.pitLaneSpeedLimit + FALLBACK_EXIT_MARGIN
  }
  // Live detection: if we've collected pit lane speeds, detect the limit from those.
  if (session.pitLaneSpeeds.length >= 5) {
    return detectSpeedLimit(session.pitLaneSpeeds) + FALLBACK_EXIT_MARGIN
  }
  // Zero data: conservative default.
  return DEFAULT_PIT_LANE_LIMIT + FALLBACK_EXIT_MARGIN
}

// Handles a normalized car data (telemetry) event.
// Also clears the inPit flag when car speed exceeds the pit exit threshold.
const handleCarDataEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data
  const speed = (d.speed as number) ?? 0

  activeSession.driverCarData.set(event.driverNumber, {
    speed,
    drs: (d.drs as number) ?? 0,
    gear: (d.gear as number) ?? 0,
  })

  // Track pit lane data and clear pit flag when car exits the pit lane.
  const pitState = activeSession.driverPitStops.get(event.driverNumber)
  if (pitState?.inPit) {
    // Collect pit lane speeds for limit detection (moving but in pit lane).
    // Capped at 500 — more than enough for accurate speed limit histogram binning.
    if (speed > 20 && speed < 120 && activeSession.pitLaneSpeeds.length < 500) {
      activeSession.pitLaneSpeeds.push(speed)
    }
    // Clear pit flag when speed exceeds exit threshold (driver is on track).
    if (speed > getPitExitThreshold(activeSession)) {
      pitState.inPit = false
      pitState.pitEntryLeaderLap = null
      activeSession.pitExitObservations.push(speed)
      // Collect a pit stop sample for progressive profile building.
      collectPitStopSample(event.driverNumber, speed, pitState)

      // Reverse timeout-based DNF if the car has rejoined the race.
      if (activeSession.timeoutDNFDrivers.has(event.driverNumber)) {
        activeSession.dnfs = activeSession.dnfs.filter(d => d.driverNumber !== event.driverNumber)
        activeSession.timeoutDNFDrivers.delete(event.driverNumber)
        log.info(`✓ Timeout DNF reversed: driver #${event.driverNumber} has exited the pit lane`)
      }
    }
  }

  // Track on-track stalls (stationary but NOT in pit) for DNF detection.
  // Skip during red flags when all cars are stationary, and non-race sessions.
  if (!pitState?.inPit && activeSession.isRaceSession && !activeSession._activeRedFlag) {
    if (speed <= TRACK_STALL_SPEED) {
      // Car is stationary on track — record leader's lap if not already tracked.
      if (!activeSession.trackStalls.has(event.driverNumber)
          && !activeSession.dnfs.some(d => d.driverNumber === event.driverNumber)) {
        const maxLap = Math.max(0, ...Array.from(activeSession.currentLapByDriver.values()))
        activeSession.trackStalls.set(event.driverNumber, maxLap)
      }
    } else if (activeSession.trackStalls.has(event.driverNumber)) {
      // Car is moving again — clear stall tracking and reverse DNF if applicable.
      activeSession.trackStalls.delete(event.driverNumber)
      if (activeSession.timeoutDNFDrivers.has(event.driverNumber)) {
        activeSession.dnfs = activeSession.dnfs.filter(d => d.driverNumber !== event.driverNumber)
        activeSession.timeoutDNFDrivers.delete(event.driverNumber)

      }
    }
  }
}

// Collects a PitStopSample when a driver exits the pit lane.
// Uses speed-aware GPS positions to find tighter entry/exit boundaries at the pit lane speed limit.
const collectPitStopSample = (
  driverNumber: number,
  exitSpeed: number,
  pitState: DriverPitState,
): void => {
  if (!activeSession || !activeSession.baselinePath || !activeSession.baselineArcLengths) return
  if (!pitState.entryPosition) return

  const exitGps = activeSession.currentPositions.get(driverNumber)
  if (!exitGps) return

  // Determine pit lane speed limit for tight boundary detection.
  const speedLimit = activeSession.pitLaneProfile?.pitLaneSpeedLimit
    ?? (activeSession.pitLaneSpeeds.length >= 5
      ? detectSpeedLimit(activeSession.pitLaneSpeeds)
      : DEFAULT_PIT_LANE_LIMIT)
  const tightLimit = speedLimit + PIT_SPEED_MARGIN

  // Find tighter entry/exit GPS: positions where speed is at the pit lane limit (not braking/accelerating).
  const atLimitPositions = pitState.pitLanePositions.filter(p => p.speed > 10 && p.speed <= tightLimit)
  const tightEntryGps = atLimitPositions.length > 0 ? atLimitPositions[0] : null
  const tightExitGps = atLimitPositions.length > 0 ? atLimitPositions[atLimitPositions.length - 1] : null

  // Compute track progress (0-1) using tight GPS if available, falling back to raw entry/exit.
  const entryGps = tightEntryGps ?? pitState.entryPosition
  const exitGpsForProgress = tightExitGps ?? exitGps

  const rawEntryProgress = computeTrackProgress(
    entryGps.x, entryGps.y,
    activeSession.baselinePath, activeSession.baselineArcLengths,
  )
  const rawExitProgress = computeTrackProgress(
    exitGpsForProgress.x, exitGpsForProgress.y,
    activeSession.baselinePath, activeSession.baselineArcLengths,
  )

  // Skip samples where entry/exit are too close — sparse data in practice/qualifying produces noise.
  let sampleRange = rawExitProgress - rawEntryProgress
  if (sampleRange <= 0) sampleRange += 1.0
  if (sampleRange < MIN_PIT_PROGRESS_RANGE) {
    pitState.entryPosition = null
    pitState.pitLanePositions = []
    return
  }

  // Pass pit lane GPS with speed data for distance-weighted pit side voting.
  // Speed filtering excludes positions where the car is still at racing speed (entry/exit transitions).
  const positionsForVote: { x: number; y: number; speed?: number }[] = pitState.pitLanePositions.length > 0
    ? pitState.pitLanePositions
    : [pitState.entryPosition, exitGps].filter(Boolean).map(p => ({ x: p!.x, y: p!.y }))

  // Compute distance-weighted pit side vote. Positions deeper in the pit lane carry more weight.
  const voteResult = computePitSideVote(positionsForVote, activeSession.baselinePath, speedLimit)

  // Clear the entry position and accumulated GPS so they are not reused.
  pitState.entryPosition = null
  pitState.pitLanePositions = []

  // Only include pit stops with clear agreement (>60% one side).
  // Ambiguous votes from noisy GPS would pollute the aggregate side decision.
  const totalW = voteResult.rightWeight + voteResult.leftWeight
  const clearVote = totalW > 0 && Math.max(voteResult.rightWeight, voteResult.leftWeight) / totalW >= 0.6

  activeSession.pitStopSamples.push({
    entryProgress: rawEntryProgress, exitProgress: rawExitProgress, exitSpeed,
    pitSideVote: voteResult.side,
    pitSideRightWeight: clearVote ? voteResult.rightWeight : 0,
    pitSideLeftWeight: clearVote ? voteResult.leftWeight : 0,
  })



  // Rebuild profile when we have enough new samples.
  maybeRebuildPitProfile()
}

// Rebuilds the pit lane profile from accumulated samples when enough data exists.
// Triggers at 3+ total samples and emits updated trackmap to the frontend.
const maybeRebuildPitProfile = (): void => {
  if (!activeSession || !activeSession.baselinePath) return

  const newSamples = activeSession.pitStopSamples.length

  // Need at least 3 observations for a meaningful profile.
  if (newSamples < 3) return

  // Compute the infield side heuristic at the midpoint of the pit lane.
  // The pit lane is virtually always on the infield side (same side as the track centroid).
  const arcLens = activeSession.baselineArcLengths ?? computeArcLengths(activeSession.baselinePath)
  const samples = activeSession.pitStopSamples
  const midEntry = samples.reduce((s, p) => s + p.entryProgress, 0) / samples.length
  const midExit = samples.reduce((s, p) => s + p.exitProgress, 0) / samples.length
  const pitMidProgress = midExit < midEntry
    ? ((midEntry + midExit + 1) / 2) % 1.0
    : (midEntry + midExit) / 2
  const infieldSide = computeInfieldSide(activeSession.baselinePath, arcLens, pitMidProgress)

  const profile = buildProfileFromSamples(
    activeSession.pitStopSamples,
    activeSession.pitLaneSpeeds,
    activeSession.baselinePath,
    infieldSide,
  )
  if (!profile) return

  activeSession.pitLaneProfile = profile

  // Emit updated trackmap so the frontend can render/update the pit building.
  const payload = buildTrackmapPayload()
  if (payload) emitToRoom(OPENF1_EVENTS.TRACKMAP, payload)
}

// Handles a normalized interval/timing event.
// Also processes NumberOfLaps, InPit, Retired, and Stopped flags from SignalR TimingData.
const handleIntervalEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return

  const data = event.data
  if (data.gapToLeader !== undefined || data.interval !== undefined) {
    activeSession.driverIntervals.set(event.driverNumber, {
      gapToLeader: (data.gapToLeader as number | string) ?? activeSession.driverIntervals.get(event.driverNumber)?.gapToLeader ?? null,
      interval: (data.interval as number | string) ?? activeSession.driverIntervals.get(event.driverNumber)?.interval ?? null,
    })
  }
  if (data.position !== undefined) {
    activeSession.driverPositions.set(event.driverNumber, data.position as number)
  }

  // Update current lap from NumberOfLaps (SignalR arrives faster than v1/laps REST polling).
  if (data.numberOfLaps !== undefined) {
    const lapNum = data.numberOfLaps as number
    const existing = activeSession.currentLapByDriver.get(event.driverNumber) ?? 0
    if (lapNum > existing) {
      activeSession.currentLapByDriver.set(event.driverNumber, lapNum)
    }
  }

  // Update pit status from TimingData InPit flag.
  if (data.inPit !== undefined) {
    const pitState = activeSession.driverPitStops.get(event.driverNumber)
    if (pitState) {
      pitState.inPit = data.inPit as boolean
    }
  }
}

// Handles a normalized pit event. Updates pit count, tracks history,
// and captures entry GPS for progressive pit lane profile building.
const handlePitEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data

  const existing = activeSession.driverPitStops.get(event.driverNumber)

  // Record the leader's current lap for timeout-based DNF detection.
  const maxLap = Math.max(0, ...Array.from(activeSession.currentLapByDriver.values()))

  const pitState: DriverPitState = {
    count: (existing?.count ?? 0) + 1,
    lastDuration: (d.pitDuration as number) ?? null,
    inPit: true,
    entryPosition: null,
    pitEntryLeaderLap: maxLap,
    pitLanePositions: [],
  }

  // Capture GPS position at pit entry for progressive pit lane profile building.
  const currentSamples = activeSession.pitLaneProfile?.samplesCollected ?? 0
  const pendingSamples = activeSession.pitStopSamples.length
  if (currentSamples + pendingSamples < MAX_PIT_SAMPLES && activeSession.baselinePath) {
    const gps = activeSession.currentPositions.get(event.driverNumber)
    if (gps) {
      pitState.entryPosition = { x: gps.x, y: gps.y }
    }
  }

  activeSession.driverPitStops.set(event.driverNumber, pitState)

  // Append to pit stop history for progressive saves.
  const pitHistory = activeSession.driverPitStopHistory.get(event.driverNumber) ?? []
  pitHistory.push({
    lap: (d.lapNumber as number) ?? activeSession.currentLapByDriver.get(event.driverNumber) ?? 0,
    duration: (d.pitDuration as number) ?? null,
    date: new Date(event.timestamp).toISOString(),
  })
  activeSession.driverPitStopHistory.set(event.driverNumber, pitHistory)
}

// Checks all in-pit drivers for timeout-based DNF detection.
// If a car has been in the pit for PIT_TIMEOUT_LAPS or more (relative to the leader),
// it is assumed to have retired. Only applies to Race/Sprint sessions.
const checkPitTimeoutDNFs = (): void => {
  if (!activeSession || !activeSession.isRaceSession) return

  const maxLap = Math.max(0, ...Array.from(activeSession.currentLapByDriver.values()))

  activeSession.driverPitStops.forEach((pitState, driverNumber) => {
    if (!pitState.inPit || pitState.pitEntryLeaderLap === null) return

    // Skip if already marked as DNF (race control or timeout).
    if (activeSession!.dnfs.some(d => d.driverNumber === driverNumber)) return

    // If the leader has completed 2+ laps since this driver entered the pit, mark as DNF.
    if (maxLap - pitState.pitEntryLeaderLap >= PIT_TIMEOUT_LAPS) {
      activeSession!.dnfs.push({
        driverNumber,
        lap: pitState.pitEntryLeaderLap,
        reason: "Assumed retired (stationary in pit lane)",
        date: new Date().toISOString(),
      })
      activeSession!.timeoutDNFDrivers.add(driverNumber)
      log.info(`⚠ Timeout DNF: driver #${driverNumber} has been in pit for ${maxLap - pitState.pitEntryLeaderLap} laps (entered on leader lap ${pitState.pitEntryLeaderLap}, now lap ${maxLap})`)
    }
  })
}

// Checks all on-track stalled drivers for timeout-based DNF detection.
// If a car has been stationary on track for TRACK_STALL_LAPS or more (relative to the leader),
// it is assumed to have retired. Only applies to Race/Sprint sessions.
const checkTrackStallDNFs = (): void => {
  if (!activeSession || !activeSession.isRaceSession) return

  const maxLap = Math.max(0, ...Array.from(activeSession.currentLapByDriver.values()))

  activeSession.trackStalls.forEach((stallLeaderLap, driverNumber) => {
    // Skip if already marked as DNF (race control or timeout).
    if (activeSession!.dnfs.some(d => d.driverNumber === driverNumber)) return

    // If the leader has completed 1+ laps since this driver stalled, mark as DNF.
    if (maxLap - stallLeaderLap >= TRACK_STALL_LAPS) {
      activeSession!.dnfs.push({
        driverNumber,
        lap: stallLeaderLap,
        reason: "Assumed retired (stationary on track)",
        date: new Date().toISOString(),
      })
      activeSession!.timeoutDNFDrivers.add(driverNumber)

    }
  })
}

// Handles a normalized stint event from any source.
// SignalR stints take priority over OpenF1 for the same driver.
// Tracks full stint history for progressive saves.
const handleStintEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  const d = event.data

  const existing = activeSession.driverStints.get(event.driverNumber)

  // If OpenF1 event and SignalR is already providing stint data for this driver, skip.
  if (event.source === "openf1" && existing?.source === "signalr") return

  const stintData: DriverStintState = {
    compound: (d.compound as string) ?? existing?.compound ?? "",
    stintNumber: (d.stintNumber as number) ?? existing?.stintNumber ?? 1,
    lapStart: (d.lapStart as number) ?? existing?.lapStart ?? 0,
    tyreAgeAtStart: (d.tyreAgeAtStart as number) ?? existing?.tyreAgeAtStart ?? 0,
    isNew: d.isNew !== undefined ? (d.isNew as boolean) : existing?.isNew,
    source: event.source === "signalr" ? "signalr" : "openf1",
  }

  // SignalR provides totalLaps directly (the actual running tyre age).
  if (event.source === "signalr" && d.totalLaps !== undefined) {
    stintData.totalLaps = d.totalLaps as number
  }

  activeSession.driverStints.set(event.driverNumber, stintData)

  // Track full stint history — append when a new stint number appears.
  const history = activeSession.driverStintHistory.get(event.driverNumber) ?? []
  const lastHistoryStint = history.length > 0 ? history[history.length - 1] : null

  // Close previous stint's lap end when a new stint starts.
  if (lastHistoryStint && stintData.stintNumber > lastHistoryStint.stintNumber) {
    const currentLap = activeSession.currentLapByDriver.get(event.driverNumber) ?? 0
    lastHistoryStint.lapEnd = currentLap > 0 ? currentLap - 1 : lastHistoryStint.lapStart
  }

  // Only append if this is a genuinely new stint (not a re-emission of the same stint).
  if (!lastHistoryStint || stintData.stintNumber > lastHistoryStint.stintNumber) {
    history.push({ ...stintData })
    activeSession.driverStintHistory.set(event.driverNumber, history)
  } else if (lastHistoryStint.stintNumber === stintData.stintNumber) {
    // Update the current stint entry with new data (e.g. compound arrived later).
    Object.assign(lastHistoryStint, stintData)
  }

}

// Handles a normalized position event (driver's race position).
const handlePositionEvent = (event: InternalEvent): void => {
  if (!activeSession || !event.driverNumber) return
  activeSession.driverPositions.set(event.driverNumber, event.data.position as number)
}

// Handles a normalized race control event.
// Extracts metadata (SC periods, red flags, DNFs) from the event.
const handleRaceControlEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data

  const rcEvent: RaceControlEvent = {
    date: (d.date as string) ?? new Date().toISOString(),
    category: (d.category as string) ?? "",
    message: (d.message as string) ?? "",
    flag: (d.flag as string) ?? null,
    scope: (d.scope as string) ?? null,
    sector: (d.sector as number) ?? null,
    driverNumber: (d.driverNumber as number) ?? null,
    lapNumber: (d.lapNumber as number) ?? null,
  }

  activeSession.raceControlMessages.push(rcEvent)

  // Extract metadata (safety car periods, red flags, DNFs) from the event.
  extractMetadataFromNormalizedRC(rcEvent)

  emitToRoom(OPENF1_EVENTS.RACE_CONTROL, rcEvent)
}

// Handles a normalized weather event.
// Captures periodic snapshots for the session weather history.
const handleWeatherEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data

  activeSession.weather = {
    airTemperature: (d.airTemperature as number) ?? 0,
    trackTemperature: (d.trackTemperature as number) ?? 0,
    humidity: (d.humidity as number) ?? 0,
    rainfall: !!d.rainfall,
    windSpeed: (d.windSpeed as number) ?? 0,
    windDirection: (d.windDirection as number) ?? 0,
    pressure: (d.pressure as number) ?? 0,
  }

  // Capture periodic weather snapshots for session history.
  const now = Date.now()
  if (now - activeSession._lastWeatherSnapshot >= WEATHER_SNAPSHOT_INTERVAL) {
    activeSession.weatherHistory.push({
      date: new Date(event.timestamp).toISOString(),
      airTemp: activeSession.weather.airTemperature,
      trackTemp: activeSession.weather.trackTemperature,
      humidity: activeSession.weather.humidity,
      rainfall: activeSession.weather.rainfall,
      windSpeed: activeSession.weather.windSpeed,
      windDirection: activeSession.weather.windDirection,
      pressure: activeSession.weather.pressure,
    })
    activeSession._lastWeatherSnapshot = now
  }

  emitToRoom(OPENF1_EVENTS.SESSION_STATE, {
    weather: activeSession.weather,
    raceControlMessages: activeSession.raceControlMessages,
    overtakes: activeSession.overtakes,
  })
}

// Handles a normalized overtake event.
const handleOvertakeEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data

  activeSession.overtakes.push({
    date: (d.date as string) ?? new Date(event.timestamp).toISOString(),
    overtakingDriverNumber: d.overtakingDriverNumber as number,
    overtakenDriverNumber: d.overtakenDriverNumber as number,
    position: d.position as number,
  })
}

// Handles a normalized clock event. Emits countdown to frontend.
const handleClockEvent = (event: InternalEvent): void => {
  const d = event.data
  emitToRoom(OPENF1_EVENTS.CLOCK, {
    remainingMs: d.remainingMs as number,
    running: d.running as boolean,
    serverTs: d.serverTs as number,
    speed: d.speed as number,
  })
}

// Handles a normalized lap count event (sets total laps for race sessions).
const handleLapCountEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data
  if (d.totalLaps !== undefined && d.totalLaps !== null) {
    activeSession.totalLaps = d.totalLaps as number
  }
}

// Handles a team radio event. Stores the radio message for the session.
const handleTeamRadioEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data

  activeSession.teamRadio.push({
    date: (d.date as string) ?? new Date(event.timestamp).toISOString(),
    driverNumber: (d.driverNumber as number) ?? 0,
    audioUrl: (d.audioUrl as string) ?? "",
  })
}

// Handles a session data event. Stores the event for the session.
// Also extracts grid position data from TimingAppData's GridPos field.
const handleSessionDataEvent = (event: InternalEvent): void => {
  if (!activeSession) return
  const d = event.data

  // Store grid position from TimingAppData GridPos field.
  if (d.key === "GridPosition" && event.driverNumber) {
    const gridPos = d.value as number
    if (!isNaN(gridPos) && gridPos > 0) {
      activeSession.driverGridPositions.set(event.driverNumber, gridPos)
    }
    return
  }

  activeSession.sessionData.push({
    date: (d.date as string) ?? new Date(event.timestamp).toISOString(),
    key: (d.key as string) ?? "",
    value: d.value as string | number | boolean,
  })
}

// ─── Race Control Metadata Extraction ───────────────────────────

// Analyzes a normalized race control event and updates session metadata.
// Detects safety car periods (SC/VSC), red flag periods, and DNF incidents.
const extractMetadataFromNormalizedRC = (rc: RaceControlEvent): void => {
  if (!activeSession) return
  const msgUpper = (rc.message || "").toUpperCase()

  // Safety car detection.
  if (rc.flag === "YELLOW" && msgUpper.includes("SAFETY CAR")) {
    const type = msgUpper.includes("VIRTUAL") ? "VSC" as const : "SC" as const
    if (!activeSession._activeSC) {
      activeSession._activeSC = {
        type,
        startLap: rc.lapNumber ?? 0,
        startTime: rc.date,
      }
    }
  }

  // Safety car ending — close the active period.
  if (activeSession._activeSC && (rc.flag === "GREEN" || msgUpper.includes("SAFETY CAR IN"))) {
    activeSession.safetyCarPeriods.push({
      ...activeSession._activeSC,
      endLap: rc.lapNumber ?? activeSession._activeSC.startLap,
      endTime: rc.date,
    })
    activeSession._activeSC = null
  }

  // Red flag detection.
  if (rc.flag === "RED") {
    if (!activeSession._activeRedFlag) {
      const reason = msgUpper.includes("INCIDENT") ? "Incident" : null
      activeSession._activeRedFlag = { startTime: rc.date, reason }
    }
  }

  // Red flag ending (green flag or restart).
  if (activeSession._activeRedFlag && rc.flag === "GREEN") {
    activeSession.redFlagPeriods.push({
      ...activeSession._activeRedFlag,
      endTime: rc.date,
    })
    activeSession._activeRedFlag = null
  }

  // DNF detection from retirement/stopped messages.
  if (rc.driverNumber && (msgUpper.includes("RETIRED") || msgUpper.includes("STOPPED"))) {
    // If this driver already had a timeout DNF, upgrade it to a race control DNF
    // (replace the timeout entry with the official reason, make it permanent).
    const existingIdx = activeSession.dnfs.findIndex((d) => d.driverNumber === rc.driverNumber)
    if (existingIdx >= 0) {
      activeSession.dnfs[existingIdx] = {
        driverNumber: rc.driverNumber,
        lap: rc.lapNumber,
        reason: rc.message,
        date: rc.date,
      }
    } else {
      activeSession.dnfs.push({
        driverNumber: rc.driverNumber,
        lap: rc.lapNumber,
        reason: rc.message,
        date: rc.date,
      })
    }
    // Remove from timeout/stall tracking — race control DNFs are permanent (never reversed).
    activeSession.timeoutDNFDrivers.delete(rc.driverNumber)
    activeSession.trackStalls.delete(rc.driverNumber)
    // Clear pit state for retired drivers so the PIT badge disappears
    // and the orphaned entry GPS position is cleaned up.
    const pitState = activeSession.driverPitStops.get(rc.driverNumber)
    if (pitState) {
      pitState.inPit = false
      pitState.entryPosition = null
      pitState.pitEntryLeaderLap = null
      pitState.pitLanePositions = []
    }
  }
}

// ─── MQTT Message Routing (Legacy) ───────────────────────────────

// Routes an incoming MQTT message through the normalizer and unified event handler.
// This is the entry point for both live MQTT and demo replay messages.
// During live sessions with recording enabled, messages are also buffered for replay.
export const handleMqttMessage = (topic: string, payload: Buffer): void => {
  try {
    const data = JSON.parse(payload.toString())

    // Buffer the message for session recording if active.
    if (activeSession?.isRecording && !activeSession.isDemo) {
      activeSession.recordedMessages.push({
        topic,
        data,
        timestamp: Date.now(),
      })
    }

    // Notify the REST poller that this topic is active on MQTT.
    markMqttReceived(topic)

    // Handle synthetic clock events from demo replay (not a real MQTT topic).
    if (topic === "synthetic:clock") {
      const clockData = data as { remainingMs: number; running: boolean }
      emitToRoom(OPENF1_EVENTS.CLOCK, {
        remainingMs: clockData.remainingMs,
        running: clockData.running,
        serverTs: Date.now(),
        speed: 1,
      })
      return
    }

    // Normalize MQTT message to internal event and route through the unified handler.
    const event = normalizeOpenF1Message(topic, data)
    if (event) {
      handleEvent(event)
    }
  } catch (err) {
    log.error(`✗ Failed to parse MQTT message on ${topic}:`, err)
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
  let pitLaneProfile: PitLaneProfile | null = null
  let totalLapsProcessed = 0
  let rotationOverride = 0
  try {
    const existing = await Trackmap.findOne({ trackName })
    if (existing && existing.path.length > 0) {
      baselinePath = existing.path.map((p) => ({ x: p.x, y: p.y }))
      // Snap last point to first so the path forms a zero-gap closed loop.
      if (baselinePath.length > 1) baselinePath[baselinePath.length - 1] = { ...baselinePath[0] }
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
      if (existing.pitLaneProfile) {
        pitLaneProfile = existing.pitLaneProfile
        log.info(`✓ Loaded pit lane profile for "${trackName}" (${existing.pitLaneProfile.samplesCollected} samples, limit: ${existing.pitLaneProfile.pitLaneSpeedLimit} km/h)`)
      }
      // Load admin-set rotation override.
      rotationOverride = existing.rotationOverride ?? 0
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
    displaySectorBoundaries: null,
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
    safetyCarPeriods: [],
    redFlagPeriods: [],
    dnfs: [],
    weatherHistory: [],
    totalLaps: null,
    _activeSC: null,
    _activeRedFlag: null,
    _lastWeatherSnapshot: 0,
    driverGridPositions: new Map(),
    driverStintHistory: new Map(),
    driverPitStopHistory: new Map(),
    teamRadio: [],
    sessionData: [],
    recordedMessages: [],
    isRecording: true,
    pitLaneProfile,
    pitExitObservations: [],
    pitLaneSpeeds: [],
    pitStopSamples: [],
    isRaceSession: checkIsRaceSession(msg.session_type || msg.session_name),
    timeoutDNFDrivers: new Set(),
    trackStalls: new Map(),
    lastEmittedProgress: new Map(),
    rotationOverride,
  }

  // Try to fetch MultiViewer outline if not cached.
  if (!activeSession.multiviewerPath) {
    await tryFetchMultiviewer(circuitKey, trackName)
  }

  // Persist session to DB immediately so it's recoverable if the server crashes.
  await createF1Session(
    msg.session_key,
    msg.meeting_key,
    "live",
    trackName,
    circuitKey,
    activeSession.sessionType,
    activeSession.sessionName,
  )

  // Start batched emissions, REST polling fallback, live timing clock, and progressive saves.
  startPositionBatching()
  startDriverStateBatching()
  onPolledMessage((topic, data) => {
    const event = normalizeOpenF1Message(topic, data)
    if (event) handleEvent(event)
  })
  startPolling(msg.session_key)
  connectLiveTiming()
  startFallbackClock()
  startProgressiveSaving()

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
  const trackmapPayload = buildTrackmapPayload()
  if (trackmapPayload) emitToRoom(OPENF1_EVENTS.TRACKMAP, trackmapPayload)
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

// Maximum byte size for recorded session messages (prevents bloating the DB).
const MAX_RECORDING_BYTES = 6 * 1024 * 1024

// Ends the current session and persists the final track map and session data.
const endSession = async (): Promise<void> => {
  if (!activeSession) return

  log.info(`🏁 Session ended: ${activeSession.trackName}`)

  // Save final track map to MongoDB.
  await saveTrackMap()

  // Finalize the session record in MongoDB (marks as finished, writes final data).
  await finalizeF1Session(activeSession.sessionKey, activeSession)

  // Save the recorded session as a replayable demo if recording was active.
  if (activeSession.isRecording && activeSession.recordedMessages.length > 0) {
    await saveSessionRecording(activeSession)
  }

  // Stop all batching, polling, live timing connection, fallback clock, and progressive saves.
  stopPositionBatching()
  stopDriverStateBatching()
  stopPolling()
  disconnectLiveTiming()
  stopFallbackClock()
  stopProgressiveSaving()

  // Notify subscribers and broadcast session end to all clients.
  emitToRoom(OPENF1_EVENTS.SESSION, { active: false, trackName: "", sessionType: "", sessionName: "" })
  broadcastLiveSession()

  activeSession = null
}

// Saves the recorded session messages as a replayable demo in the unified F1Session model.
// Trims to the activity window and caps at MAX_RECORDING_BYTES to stay within BSON limits.
const saveSessionRecording = async (session: SessionState): Promise<void> => {
  try {
    let messages = session.recordedMessages

    // Trim from the end if too large.
    let byteSize = Buffer.byteLength(JSON.stringify(messages))
    while (byteSize > MAX_RECORDING_BYTES && messages.length > 0) {
      messages = messages.slice(0, Math.floor(messages.length * 0.8))
      byteSize = Buffer.byteLength(JSON.stringify(messages))
    }

    if (messages.length === 0) return

    const sessionEndTs = messages[messages.length - 1].timestamp

    // Use a different session key for the demo variant (offset by 1M to avoid collision).
    const demoSessionKey = session.sessionKey + 1_000_000

    await saveDemoSession(
      demoSessionKey,
      session.meetingKey,
      null,
      session.trackName,
      session.sessionType,
      session.sessionName,
      session.drivers.size,
      sessionEndTs,
      messages as ReplayMessage[],
    )

    const durationMins = ((sessionEndTs - messages[0].timestamp) / 60000).toFixed(1)
    log.info(`✓ Saved session recording as demo ${demoSessionKey} (${messages.length} messages, ${durationMins} min, ~${(byteSize / 1024 / 1024).toFixed(1)}MB)`)
  } catch (err) {
    log.error("✗ Failed to save session recording:", err)
  }
}

// ─── Lap Processing ─────────────────────────────────────────────

// Internal lap handler — stores the lap, updates best times, and triggers track map rebuilding.
// Called by handleLapEvent() with a reconstructed OpenF1LapMsg.
const handleLapMessage = async (msg: OpenF1LapMsg): Promise<void> => {
  if (!activeSession || msg.session_key !== activeSession.sessionKey) return

  // Update the driver's current lap number.
  // Record when the lap counter changes for GPS-settle detection in demo segment truncation.
  const prevLap = activeSession.currentLapByDriver.get(msg.driver_number)
  activeSession.currentLapByDriver.set(msg.driver_number, msg.lap_number)
  if (prevLap !== msg.lap_number) {
    driverLapTransitionTs.set(msg.driver_number, Date.now())
  }

  // Check for timeout-based DNFs on every lap completion (any driver's lap may push
  // the leader count past the threshold for another driver sitting in the pit or stalled on track).
  checkPitTimeoutDNFs()
  checkTrackStallDNFs()

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

    log.verbose(`Laps: ${allLaps.length} total, ${fastLaps.length} fast, shouldUpdate: ${fastLaps.length > 0 && shouldUpdate(fastLaps.length, activeSession.lastUpdateLap)}`)

    if (fastLaps.length > 0 && shouldUpdate(fastLaps.length, activeSession.lastUpdateLap)) {
      await rebuildTrackMap(fastLaps)
    }
  }
}

// ─── Track Map Rebuilding ────────────────────────────────────────

// Flattens positionsByDriverLap into a single chronologically sorted array per driver.
// Used by sector boundary computation which needs all positions for a driver in one array.
const buildFlatPositions = (): Map<number, { x: number; y: number; date: string }[]> => {
  const flat = new Map<number, { x: number; y: number; date: string }[]>()
  if (!activeSession) return flat
  activeSession.positionsByDriverLap.forEach((lapMap, driverNum) => {
    const all: { x: number; y: number; date: string }[] = []
    lapMap.forEach((positions) => all.push(...positions))
    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    flat.set(driverNum, all)
  })
  return flat
}

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
  // Snap last point to first so the path forms a zero-gap closed loop.
  if (newPath.length > 1) newPath[newPath.length - 1] = { ...newPath[0] }
  activeSession.baselinePath = newPath
  activeSession.baselineArcLengths = computeArcLengths(newPath)
  activeSession.totalLapsProcessed = validatedLaps.length
  activeSession.lastUpdateLap = validatedLaps.length

  // Attempt to compute sector boundaries if not yet determined.
  if (!activeSession.sectorBoundaries) {
    const allLaps = Array.from(activeSession.completedLaps.values())
    const flatPositions = buildFlatPositions()

    // Log sector computation attempt for diagnostics.
    log.info(`Attempting sector computation: ${allLaps.length} laps, ${flatPositions.size} drivers with GPS, refPath: ${newPath.length} points`)

    const boundaries = computeSectorBoundaries(allLaps, flatPositions, newPath)
    if (boundaries) {
      activeSession.sectorBoundaries = boundaries
      log.info(`✓ Sector boundaries computed for "${activeSession.trackName}"`)

      // Also compute directly against multiviewerPath for accurate display.
      if (activeSession.multiviewerPath) {
        activeSession.displaySectorBoundaries = computeSectorBoundaries(allLaps, flatPositions, activeSession.multiviewerPath)
        if (activeSession.displaySectorBoundaries) {
          log.info(`✓ Display sector boundaries computed against MultiViewer path`)
        }
      }
    }
  }

  // Emit the best available track path. If we have a MultiViewer outline, keep using
  // it for display; the GPS path is still maintained as the reference for position mapping.
  const rebuildPayload = buildTrackmapPayload({
    path: getDisplayPath() || newPath,
    pathVersion: validatedLaps.length,
    totalLapsProcessed: validatedLaps.length,
  })
  if (rebuildPayload) emitToRoom(OPENF1_EVENTS.TRACKMAP, rebuildPayload)

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
      existing.pitLaneProfile = activeSession.pitLaneProfile || existing.pitLaneProfile
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
        pitLaneProfile: activeSession.pitLaneProfile,
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

  // Also compute directly against multiviewerPath for accurate display.
  if (activeSession?.multiviewerPath && sectorBounds) {
    activeSession.displaySectorBoundaries = computeSectorBoundaries(allLaps, positionsByDriver, activeSession.multiviewerPath)
    if (activeSession.displaySectorBoundaries) {
      log.info(`✓ Display sector boundaries computed against MultiViewer path from demo data`)
    }
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
    const demoPayload = buildTrackmapPayload()
    if (demoPayload) emitToRoom(OPENF1_EVENTS.TRACKMAP, demoPayload)
  }
}

// ─── MultiViewer Integration ─────────────────────────────────────

// Returns the best available display path: MultiViewer if available, GPS fallback otherwise.
const getDisplayPath = (): { x: number; y: number }[] | null => {
  if (!activeSession) return null
  return activeSession.multiviewerPath || activeSession.baselinePath
}

// Returns sector boundaries converted to the display path's progress values.
// Returns sector boundary progress values mapped to the active display path.
// Prefers displaySectorBoundaries (computed directly on multiviewerPath), falls back
// to GPS coordinate projection, then raw baselinePath-relative values.
const getDisplaySectorBoundaries = (): { startFinish: number; sector1_2: number; sector2_3: number } | null => {
  if (!activeSession?.sectorBoundaries) return null
  const sb = activeSession.sectorBoundaries
  const display = activeSession.multiviewerPath
  // No conversion needed if we're using the GPS baseline as the display path.
  if (!display || display === activeSession.baselinePath) return sb

  // Preferred: sectors computed directly on the multiviewerPath (most accurate).
  if (activeSession.displaySectorBoundaries) return activeSession.displaySectorBoundaries

  // Fallback: project raw GPS coordinates of sector crossings onto the display
  // path without hints — sectors are too far apart for the ±15% window to work.
  const dispArc = activeSession.multiviewerArcLengths
  if (sb.startFinishGps && sb.sector1_2Gps && sb.sector2_3Gps && dispArc) {
    return {
      startFinish: computeTrackProgress(sb.startFinishGps.x, sb.startFinishGps.y, display, dispArc),
      sector1_2: computeTrackProgress(sb.sector1_2Gps.x, sb.sector1_2Gps.y, display, dispArc),
      sector2_3: computeTrackProgress(sb.sector2_3Gps.x, sb.sector2_3Gps.y, display, dispArc),
    }
  }

  // Last resort: return baselinePath-relative values (will be inaccurate on MV tracks).
  return sb
}

// Builds the standard trackmap payload emitted to clients. Returns null if no displayable path.
const buildTrackmapPayload = (overrides?: { path?: { x: number; y: number }[]; pathVersion?: number; totalLapsProcessed?: number }) => {
  if (!activeSession) return null
  const displayPath = overrides?.path ?? getDisplayPath()
  if (!displayPath || displayPath.length === 0) return null
  return {
    trackName: activeSession.trackName,
    path: displayPath,
    pathVersion: overrides?.pathVersion ?? activeSession.totalLapsProcessed,
    totalLapsProcessed: overrides?.totalLapsProcessed ?? activeSession.totalLapsProcessed,
    corners: activeSession.corners,
    sectorBoundaries: getDisplaySectorBoundaries(),
    pitLaneProfile: activeSession.pitLaneProfile,
    rotationOverride: activeSession.rotationOverride,
  }
}

// Updates the rotation override for a trackmap and broadcasts to all connected clients.
// Called from the GraphQL resolver when an admin adjusts the track rotation.
export const setTrackmapRotation = async (trackName: string, rotation: number): Promise<boolean> => {
  const clamped = ((rotation % 360) + 360) % 360

  // Persist to MongoDB.
  await Trackmap.updateOne(
    { trackName },
    { $set: { rotationOverride: clamped, updated_at: new Date().toISOString() } },
  )

  // Update the active session cache and broadcast to all clients.
  if (activeSession && activeSession.trackName === trackName) {
    activeSession.rotationOverride = clamped
    const payload = buildTrackmapPayload()
    if (payload) emitToRoom(OPENF1_EVENTS.TRACKMAP, payload)
  }

  return true
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
    activeSession.multiviewerArcLengths = computeArcLengths(activeSession.multiviewerPath)
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

    // Recompute display sector boundaries against the new multiviewer path
    // if baseline sectors and position data are available.
    if (activeSession.sectorBoundaries && activeSession.positionsByDriverLap.size > 0) {
      const allLaps = Array.from(activeSession.completedLaps.values())
      const flatPositions = buildFlatPositions()
      activeSession.displaySectorBoundaries = computeSectorBoundaries(allLaps, flatPositions, activeSession.multiviewerPath!)
      if (activeSession.displaySectorBoundaries) {
        mvLog.info(`✓ Display sector boundaries recomputed against MultiViewer path`)
      }
    }
  } catch (err) {
    mvLog.error("⚠ MultiViewer track fetch failed, using GPS fallback:", err)
  }
}

// ─── Driver State Aggregation & Batching ─────────────────────────

// Zeroes out segment values the car hasn't reached yet during demo replay.
// In live mode, MQTT naturally sends progressive data (growing arrays). In demo
// mode, the REST API returns complete final lap records with all segments filled,
// so we mask future segments to prevent the frontend from seeing ahead.
const truncateDemoSegments = (
  currentLapData: OpenF1LapMsg,
  driverNumber: number,
): { sector1: number[]; sector2: number[]; sector3: number[] } => {
  const raw = {
    sector1: [...(currentLapData.segments_sector_1 ?? [])],
    sector2: [...(currentLapData.segments_sector_2 ?? [])],
    sector3: [...(currentLapData.segments_sector_3 ?? [])],
  }

  // Graceful fallback: if track progress data isn't available, return raw segments.
  if (!activeSession?.sectorBoundaries || !activeSession.baselinePath || !activeSession.baselineArcLengths) return raw

  const pos = activeSession.currentPositions.get(driverNumber)
  if (!pos) return raw

  const progress = computeTrackProgress(pos.x, pos.y, activeSession.baselinePath, activeSession.baselineArcLengths)
  const { startFinish, sector1_2, sector2_3 } = activeSession.sectorBoundaries

  // Compute lap-relative distance from the start/finish line.
  const lapDist = forwardDistance(startFinish, progress)
  const s1End = forwardDistance(startFinish, sector1_2)
  const s2End = forwardDistance(startFinish, sector2_3)

  // Determine which sector the car is currently in.
  let currentSector: number
  if (lapDist < s1End) currentSector = 0
  else if (lapDist < s2End) currentSector = 1
  else currentSector = 2

  // Process each sector: past → keep all, current → proportional, future → zero all.
  const sectorDefs = [
    { arr: raw.sector1, sectorIdx: 0, start: 0, end: s1End },
    { arr: raw.sector2, sectorIdx: 1, start: s1End, end: s2End },
    { arr: raw.sector3, sectorIdx: 2, start: s2End, end: 1.0 },
  ]

  // Guard against stale GPS during lap transitions. When the lap counter just
  // changed, GPS may still reflect the end of the previous lap (high progress).
  // Zero all segments until GPS settles past S/F.
  const GPS_SETTLE_MS = 1500
  const transitionTs = driverLapTransitionTs.get(driverNumber)
  if (transitionTs && Date.now() - transitionTs < GPS_SETTLE_MS && lapDist > 0.5) {
    for (const { arr } of sectorDefs) {
      for (let i = 0; i < arr.length; i++) arr[i] = 0
    }
    return raw
  }

  for (const { arr, sectorIdx, start, end } of sectorDefs) {
    if (sectorIdx < currentSector) continue
    if (sectorIdx > currentSector) {
      for (let i = 0; i < arr.length; i++) arr[i] = 0
      continue
    }
    // Current sector — show segments the car has entered (ceil so the current segment lights up).
    const sectorLen = end - start
    if (sectorLen <= 0) continue
    const progressInSector = lapDist - start
    const fraction = Math.max(0, progressInSector / sectorLen)
    const segmentsToShow = Math.ceil(fraction * arr.length)
    for (let i = segmentsToShow; i < arr.length; i++) arr[i] = 0
  }

  return raw
}

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
    // SignalR provides totalLaps directly; OpenF1 requires computation from lap numbers.
    const tyreAge = stintState
      ? (stintState.totalLaps !== undefined
          ? stintState.totalLaps
          : Math.max(0, currentLap - stintState.lapStart) + stintState.tyreAgeAtStart)
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

      // In demo mode, zero out segments the car hasn't reached yet (REST API returns
      // complete final lap records). In live mode, MQTT data is naturally progressive.
      segments: activeSession!.isDemo && currentLapData
        ? truncateDemoSegments(currentLapData, driverNumber)
        : {
            sector1: currentLapData?.segments_sector_1 ?? [],
            sector2: currentLapData?.segments_sector_2 ?? [],
            sector3: currentLapData?.segments_sector_3 ?? [],
          },

      tyreCompound: stintState?.compound ?? null,
      tyreAge,
      inPit: pitState?.inPit ?? false,
      pitStops: pitState?.count ?? 0,
      isPitOutLap: latestLap?.is_pit_out_lap ?? false,
      retired: activeSession!.dnfs.some((d) => d.driverNumber === driverNumber),

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

// ─── Progressive Database Saving ──────────────────────────────────

// Starts a periodic timer that flushes accumulated session data to MongoDB.
// Only active during live sessions — demos don't need progressive saving.
const startProgressiveSaving = (): void => {
  stopProgressiveSaving()

  progressiveSaveTimer = setInterval(() => {
    if (!activeSession || activeSession.isDemo) return
    updateF1Session(activeSession)
  }, PROGRESSIVE_SAVE_INTERVAL)
}

// Stops the progressive save timer.
const stopProgressiveSaving = (): void => {
  if (progressiveSaveTimer) {
    clearInterval(progressiveSaveTimer)
    progressiveSaveTimer = null
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

    // Pre-cached arc-length table for the display path (hot path).
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

      // Project GPS coordinates directly onto the display path for correct positioning.
      // Both paths use the same F1 coordinate system, so nearest-segment projection works.
      // Pass the driver's previous progress as a hint to avoid nearest-segment ambiguity
      // on tracks where sections run close together (e.g. Shanghai turns 14-16).
      if (shouldMap) {
        const hint = activeSession!.lastEmittedProgress.get(driverNumber)
        progress = computeTrackProgress(pos.x, pos.y, displayPath!, multiviewerArc, hint)
        activeSession!.lastEmittedProgress.set(driverNumber, progress)
        const mapped = mapProgressToPoint(progress, displayPath!, multiviewerArc)
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
// Returns true if a session was found and started.
export const checkForActiveSession = async (): Promise<boolean> => {
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
      log.info(`🏎️ Found active session: ${latest.session_name}`)
      await startSession(latest)
      return true
    }
    return false
  } catch (err) {
    log.error("⚠ Failed to check for active sessions:", err)
    return false
  }
}
