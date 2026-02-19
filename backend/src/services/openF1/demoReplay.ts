import axios from "axios"
import { getOpenF1Token } from "./auth"
import { handleMqttMessage, emitToRoom, emitToDemo, initDemoSession, endDemoSession, emitDemoTrackmap, buildTrackFromDemoData, setActivePitLaneProfile, OPENF1_EVENTS, setOnDemoStop, withDemoContext } from "./sessionManager"
import {
  OpenF1LocationMsg, OpenF1LapMsg, OpenF1SessionMsg, OpenF1DriverMsg, DriverInfo,
  OpenF1CarDataMsg, OpenF1IntervalMsg, OpenF1PitMsg, OpenF1StintMsg,
  OpenF1PositionMsg, OpenF1RaceControlMsg, OpenF1WeatherMsg, PitLaneProfile,
  MAX_PIT_SAMPLES,
} from "./types"
import { computePitSideVote, isClockwise, median, circularMedian, PIT_SPEED_MARGIN, MIN_PIT_PROGRESS_RANGE, computeInfieldSide } from "./pitLaneUtils"
import { loadDemoSession, saveDemoSession, ReplayMessage } from "../../models/f1Session"
import { computeTrackProgress, computeArcLengths } from "./trackProgress"
import Trackmap from "../../models/trackmap"
import { resolveSessionPath, fetchStaticSession } from "./staticFileClient"
import { convertStaticToOpenF1 } from "./staticFileConverter"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Default session key for demo (2024 Bahrain GP Qualifying).
const DEFAULT_SESSION_KEY = 9158

// Interval between replay ticks (ms).
const REPLAY_TICK_INTERVAL = 50

// Minimum gap between sampled car_data messages per driver (ms).
// OpenF1 sends car_data at ~3.7Hz; we sample to ~1Hz for demo storage.
const CAR_DATA_SAMPLE_INTERVAL_MS = 1000

// Replay state.
let replayTimer: ReturnType<typeof setInterval> | null = null
let replayMessages: { topic: string; data: unknown; timestamp: number }[] = []
let replayIndex = 0
let replayStartTime = 0
let replayBaseTime = 0
let replaySpeed = 4
let replayActive = false
let replaySessionKey = 0
let replayTrackName = ""
// Generation counter — prevents orphaned timers when a new replay starts
// while the previous one is still initializing (e.g. awaiting MultiViewer fetch).
let replayGeneration = 0

// Represents the current demo status.
export interface DemoStatus {
  active: boolean
  sessionKey: number | null
  trackName: string
  speed: number
}

// Returns the current demo replay status.
export const getDemoStatus = (): DemoStatus => ({
  active: replayActive,
  sessionKey: replayActive ? replaySessionKey : null,
  trackName: replayTrackName,
  speed: replaySpeed,
})

// Emits a demo phase update to the demo viewer socket.
const emitDemoPhase = (phase: "fetching" | "ready" | "stopped" | "ended"): void => {
  emitToDemo(OPENF1_EVENTS.DEMO_STATUS, { phase })
}

// Generates synthetic clock events from the full (pre-trim) message queue.
// Scans race_control messages for RED/GREEN flag transitions to compute pause periods,
// then produces clock events at start, each flag transition, and periodically (~5s) while running.
// These events are later replayed as session:clock to drive the frontend countdown.
const generateSyntheticClock = (
  messages: { topic: string; data: unknown; timestamp: number }[],
  sessionEndTs: number,
): { topic: string; data: { remainingMs: number; running: boolean }; timestamp: number }[] => {
  const clockEvents: { topic: string; data: { remainingMs: number; running: boolean }; timestamp: number }[] = []

  // Extract track-wide flag events (RED/GREEN) from the full dataset.
  // Ignores driver/sector-scoped flags to avoid false clock pauses.
  const flagEvents: { ts: number; flag: string }[] = []
  for (const msg of messages) {
    if (msg.topic === "v1/race_control") {
      const rc = msg.data as { flag?: string | null; scope?: string | null }
      if ((rc.flag === "RED" || rc.flag === "GREEN") && rc.scope === "Track") {
        flagEvents.push({ ts: msg.timestamp, flag: rc.flag })
      }
    }
  }

  const firstDataTs = messages[0]?.timestamp || 0
  if (!firstDataTs || !sessionEndTs || sessionEndTs <= firstDataTs) return clockEvents

  // Compute total stoppage time by pairing RED→GREEN transitions.
  let totalStoppage = 0
  let redStart: number | null = null
  for (const fe of flagEvents) {
    if (fe.flag === "RED") {
      redStart = fe.ts
    } else if (fe.flag === "GREEN" && redStart !== null) {
      totalStoppage += fe.ts - redStart
      redStart = null
    }
  }

  // Total racing time is the session duration minus all completed pause periods.
  const totalRacingTime = (sessionEndTs - firstDataTs) - totalStoppage

  // Walk through the session timeline generating clock events.
  let running = true
  let accumulatedStoppage = 0
  let currentRedStart: number | null = null
  let flagIdx = 0
  const PERIODIC_INTERVAL = 5000

  // Helper: compute remaining time at a given timestamp.
  const computeRemaining = (ts: number): number => {
    const racingElapsed = (ts - firstDataTs) - accumulatedStoppage
    return Math.max(0, totalRacingTime - racingElapsed)
  }

  // Emit initial clock event at the start of data.
  clockEvents.push({
    topic: "synthetic:clock",
    data: { remainingMs: totalRacingTime, running: true },
    timestamp: firstDataTs,
  })

  // Generate events across the session timeline in PERIODIC_INTERVAL steps.
  let t = firstDataTs + PERIODIC_INTERVAL
  while (t <= sessionEndTs) {
    // Process any flag transitions that occur before or at time t.
    while (flagIdx < flagEvents.length && flagEvents[flagIdx].ts <= t) {
      const fe = flagEvents[flagIdx]
      if (fe.flag === "RED" && running) {
        running = false
        currentRedStart = fe.ts
        clockEvents.push({
          topic: "synthetic:clock",
          data: { remainingMs: computeRemaining(fe.ts), running: false },
          timestamp: fe.ts,
        })
      } else if (fe.flag === "GREEN" && !running && currentRedStart !== null) {
        accumulatedStoppage += fe.ts - currentRedStart
        currentRedStart = null
        running = true
        clockEvents.push({
          topic: "synthetic:clock",
          data: { remainingMs: computeRemaining(fe.ts), running: true },
          timestamp: fe.ts,
        })
      }
      flagIdx++
    }

    // Emit periodic clock event while running.
    if (running) {
      clockEvents.push({
        topic: "synthetic:clock",
        data: { remainingMs: computeRemaining(t), running: true },
        timestamp: t,
      })
    }

    t += PERIODIC_INTERVAL
  }

  // Emit a final clock event at session end.
  clockEvents.push({
    topic: "synthetic:clock",
    data: { remainingMs: 0, running: false },
    timestamp: sessionEndTs,
  })

  return clockEvents
}

// Pit stop bonus weight — each pit stop in the window is worth this many laps
// when scoring candidate midpoints. Pit stops provide irreplaceable data for
// pit lane profile building, so they're weighted heavily.
const PIT_STOP_WEIGHT = 5

// Computes the optimal midpoint for demo window selection by balancing track
// activity (laps) and pit stop coverage. Slides a window of EFFECTIVE_WINDOW_MS
// across the session and picks the start point that maximizes a combined score.
// Scores against the effective window (~5 min) that survives trimming, not the
// larger fetch window, so the logged pit count matches what actually appears.
const computeOptimalMidpoint = (
  lapTimestamps: number[],
  pitStopTimestamps: number[],
  fallbackMs: number,
): number => {
  if (lapTimestamps.length === 0) return fallbackMs

  // Exclude candidates from the first 10 minutes of the race.
  const earliestAllowed = lapTimestamps[0] + RACE_START_EXCLUSION_MS
  const candidates = lapTimestamps.filter(t => t >= earliestAllowed)
  // If all laps fall within the exclusion zone (very short session), use all laps.
  const effectiveCandidates = candidates.length > 0 ? candidates : lapTimestamps

  // If no pit stops, fall back to median of eligible candidates.
  if (pitStopTimestamps.length === 0) {
    return effectiveCandidates[Math.floor(effectiveCandidates.length / 2)]
  }

  // Score each candidate midpoint.
  let bestScore = -1
  let bestMidpoint = effectiveCandidates[Math.floor(effectiveCandidates.length / 2)]

  for (const candidate of effectiveCandidates) {
    const windowEnd = candidate + EFFECTIVE_WINDOW_MS
    const lapsInWindow = lapTimestamps.filter(t => t >= candidate && t <= windowEnd).length
    const pitsInWindow = pitStopTimestamps.filter(t => t >= candidate && t <= windowEnd).length
    const score = lapsInWindow + pitsInWindow * PIT_STOP_WEIGHT

    if (score > bestScore) {
      bestScore = score
      bestMidpoint = candidate
    }
  }

  const medianLap = lapTimestamps[Math.floor(lapTimestamps.length / 2)]
  const shiftSec = ((bestMidpoint - medianLap) / 1000).toFixed(0)
  const pitsInWindow = pitStopTimestamps.filter(t => t >= bestMidpoint && t <= bestMidpoint + EFFECTIVE_WINDOW_MS).length
  log.info(`Optimal midpoint: ${pitsInWindow} pit stops in ~5min window (shifted ${shiftSec}s from median)`)

  return bestMidpoint
}

// Fetches all session data from the OpenF1 REST API and builds the message queue.
const fetchFromAPI = async (
  sessionKey: number,
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; circuitKey: number | null; trackName: string; sessionType: string; sessionName: string; driverCount: number; sessionEndTs: number; totalLaps: number }> => {
  const token = await getOpenF1Token()
  const authHeaders = { Authorization: `Bearer ${token}` }

  // Fetch session info.
  const sessionRes = await axios.get<OpenF1SessionMsg[]>(
    `${OPENF1_API_BASE}/sessions?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  if (sessionRes.data.length === 0) {
    throw new Error(`No session found for key ${sessionKey}`)
  }

  const session = sessionRes.data[0]
  const trackName = session.circuit_short_name || session.session_name
  const circuitKey = session.circuit_key ?? null
  log.info(`Track: ${trackName}, Session: ${session.session_name}, Circuit Key: ${circuitKey}`)

  // Fetch all drivers for this session.
  const driversRes = await axios.get<OpenF1DriverMsg[]>(
    `${OPENF1_API_BASE}/drivers?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  const allDrivers = driversRes.data
  const driverNumbers = allDrivers.map((d: OpenF1DriverMsg) => d.driver_number)

  log.info(`Fetching data for ${driverNumbers.length} drivers: ${driverNumbers.join(", ")}`)

  // Fetch all laps first — needed to find the activity midpoint for windowed fetching.
  const lapsRes = await axios.get<OpenF1LapMsg[]>(
    `${OPENF1_API_BASE}/laps?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Extract lap timestamps for midpoint computation.
  const lapTimestamps = lapsRes.data
    .filter((l: OpenF1LapMsg) => l.date_start)
    .map((l: OpenF1LapMsg) => new Date(l.date_start!).getTime())
    .sort((a: number, b: number) => a - b)

  // Fetch pit stop timestamps early so we can factor pit density into window placement.
  const pitsForWindow = await axios.get<OpenF1PitMsg[]>(
    `${OPENF1_API_BASE}/pit?session_key=${sessionKey}`,
    { headers: authHeaders },
  )
  const pitTimestamps = pitsForWindow.data
    .filter((p: OpenF1PitMsg) => p.date)
    .map((p: OpenF1PitMsg) => new Date(p.date).getTime())
    .sort((a: number, b: number) => a - b)

  // Compute optimal midpoint balancing track activity and pit stop coverage.
  // Scores against the ~5min effective window that survives the 6MB trim.
  const activityMidpointMs = computeOptimalMidpoint(
    lapTimestamps, pitTimestamps,
    new Date(session.date_start || Date.now()).getTime(),
  )

  // 2 min buffer before + 10 min after = ~8 min of data (2 min at 4x speed).
  const windowStartMs = activityMidpointMs - 2 * 60 * 1000
  const windowEndMs = activityMidpointMs + 10 * 60 * 1000
  const windowStartISO = new Date(windowStartMs).toISOString()
  const windowEndISO = new Date(windowEndMs).toISOString()
  const dateFilter = `&date>=${windowStartISO}&date<=${windowEndISO}`
  // Context filter: session start → window end. Used for low-volume stateful data
  // (pits, race control) so we capture full history leading into the replay window.
  const contextFilter = `&date<=${windowEndISO}`

  log.info(`Activity window: ${windowStartISO} → ${windowEndISO} (from ${lapTimestamps.length} laps)`)

  // Fetch location (GPS) data per driver within the activity window.
  const allLocations: OpenF1LocationMsg[] = []
  for (const driverNum of driverNumbers) {
    const locRes = await axios.get<OpenF1LocationMsg[]>(
      `${OPENF1_API_BASE}/location?session_key=${sessionKey}&driver_number=${driverNum}${dateFilter}`,
      { headers: authHeaders },
    )
    allLocations.push(...locRes.data)
  }

  // Fetch interval data from session start to window end (full context for initial state).
  const intervalsRes = await axios.get<OpenF1IntervalMsg[]>(
    `${OPENF1_API_BASE}/intervals?session_key=${sessionKey}${contextFilter}`,
    { headers: authHeaders },
  )

  // Fetch race position data from session start to window end (full context for preamble).
  const positionRes = await axios.get<OpenF1PositionMsg[]>(
    `${OPENF1_API_BASE}/position?session_key=${sessionKey}${contextFilter}`,
    { headers: authHeaders },
  )

  // Fetch stint data (no date field in API — fetched in full, filtered later).
  const stintsRes = await axios.get<OpenF1StintMsg[]>(
    `${OPENF1_API_BASE}/stints?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch all pit stop data from session start to window end (full context).
  const pitRes = await axios.get<OpenF1PitMsg[]>(
    `${OPENF1_API_BASE}/pit?session_key=${sessionKey}${contextFilter}`,
    { headers: authHeaders },
  )

  // Fetch all race control messages from session start to window end (full context).
  const raceControlRes = await axios.get<OpenF1RaceControlMsg[]>(
    `${OPENF1_API_BASE}/race_control?session_key=${sessionKey}${contextFilter}`,
    { headers: authHeaders },
  )

  // Fetch weather data from session start to window end (full context for initial state).
  const weatherRes = await axios.get<OpenF1WeatherMsg[]>(
    `${OPENF1_API_BASE}/weather?session_key=${sessionKey}${contextFilter}`,
    { headers: authHeaders },
  )

  // Fetch car telemetry per driver within the activity window, sampled to ~1Hz.
  const allCarData: OpenF1CarDataMsg[] = []
  for (const driverNum of driverNumbers) {
    const carDataRes = await axios.get<OpenF1CarDataMsg[]>(
      `${OPENF1_API_BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNum}${dateFilter}`,
      { headers: authHeaders },
    )

    // Sample to ~1Hz: keep one message per CAR_DATA_SAMPLE_INTERVAL_MS.
    let lastKeptTs = 0
    carDataRes.data.forEach((cd) => {
      const ts = new Date(cd.date).getTime()
      if (ts - lastKeptTs >= CAR_DATA_SAMPLE_INTERVAL_MS) {
        allCarData.push(cd)
        lastKeptTs = ts
      }
    })
  }

  log.info(`Fetched ${lapsRes.data.length} laps, ${allLocations.length} locations, ${intervalsRes.data.length} intervals, ${positionRes.data.length} positions, ${stintsRes.data.length} stints, ${pitRes.data.length} pits, ${raceControlRes.data.length} race_control, ${weatherRes.data.length} weather, ${allCarData.length} car_data (sampled)`)

  // Build a unified chronological message queue.
  const messages: { topic: string; data: unknown; timestamp: number }[] = []

  // Add a session start message at the window start (preamble).
  const sessionStartMsg: OpenF1SessionMsg = {
    ...session,
    status: "Started",
  }
  messages.push({
    topic: "v1/sessions",
    data: sessionStartMsg,
    timestamp: windowStartMs - 200,
  })

  // Add driver messages just after session start (preamble).
  allDrivers.forEach((driver: OpenF1DriverMsg) => {
    messages.push({
      topic: "v1/drivers",
      data: driver,
      timestamp: windowStartMs - 100,
    })
  })

  // Add all lap messages up to window end (full context for currentLapByDriver).
  lapsRes.data.forEach((lap: OpenF1LapMsg) => {
    const ts = lap.date_start ? new Date(lap.date_start).getTime() : 0
    if (ts > 0 && ts <= windowEndMs) {
      messages.push({ topic: "v1/laps", data: lap, timestamp: ts })
    }
  })

  // Add location (GPS) messages.
  allLocations.forEach((loc: OpenF1LocationMsg) => {
    const ts = new Date(loc.date).getTime()
    if (ts > 0) {
      messages.push({ topic: "v1/location", data: loc, timestamp: ts })
    }
  })

  // Add interval messages.
  intervalsRes.data.forEach((interval: OpenF1IntervalMsg) => {
    const ts = interval.date ? new Date(interval.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/intervals", data: interval, timestamp: ts })
    }
  })

  // Add race position messages.
  positionRes.data.forEach((pos: OpenF1PositionMsg) => {
    const ts = pos.date ? new Date(pos.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/position", data: pos, timestamp: ts })
    }
  })

  // Build a lookup from (driver, lapNumber) → date_start timestamp for stint timeline placement.
  const lapTimestampMap = new Map<string, number>()
  lapsRes.data.forEach((lap: OpenF1LapMsg) => {
    const ts = lap.date_start ? new Date(lap.date_start).getTime() : 0
    if (ts > 0) {
      lapTimestampMap.set(`${lap.driver_number}-${lap.lap_number}`, ts)
    }
  })

  // Determine the max lap per driver in the data window (to filter out future stints).
  const maxLapByDriver = new Map<number, number>()
  lapsRes.data.forEach((lap: OpenF1LapMsg) => {
    const ts = lap.date_start ? new Date(lap.date_start).getTime() : 0
    if (ts > 0 && ts <= windowEndMs) {
      const existing = maxLapByDriver.get(lap.driver_number) || 0
      if (lap.lap_number > existing) {
        maxLapByDriver.set(lap.driver_number, lap.lap_number)
      }
    }
  })

  // Add stint messages at their actual chronological time (derived from lap data).
  // Stints beyond the data window are skipped to prevent future stints overriding current ones.
  stintsRes.data.forEach((stint: OpenF1StintMsg) => {
    const maxLap = maxLapByDriver.get(stint.driver_number) || 0
    if (stint.lap_start > maxLap + 1) return

    const lapTs = lapTimestampMap.get(`${stint.driver_number}-${stint.lap_start}`)
    const prevLapTs = !lapTs
      ? lapTimestampMap.get(`${stint.driver_number}-${stint.lap_start - 1}`)
      : undefined
    // Real timestamp if available, otherwise inject as early preamble (first stint).
    const timestamp = lapTs || prevLapTs || (windowStartMs - 50)
    messages.push({ topic: "v1/stints", data: stint, timestamp })
  })

  // Add pit messages, anchored to just before the next lap starts.
  // OpenF1's pit.date is recorded after the stop completes (potentially after the new
  // stint's lap begins), so we anchor to the lap timeline to ensure correct ordering.
  pitRes.data.forEach((pit: OpenF1PitMsg) => {
    const nextLapTs = lapTimestampMap.get(`${pit.driver_number}-${(pit.lap_number || 0) + 1}`)
    const currentLapTs = lapTimestampMap.get(`${pit.driver_number}-${pit.lap_number}`)
    const rawTs = pit.date ? new Date(pit.date).getTime() : 0
    // Place just before next lap start (ensures before new stint), else current lap, else raw.
    const timestamp = nextLapTs ? nextLapTs - 500 : (currentLapTs || rawTs)
    if (timestamp > 0) {
      messages.push({ topic: "v1/pit", data: pit, timestamp })
    }
  })

  // Add race control messages.
  raceControlRes.data.forEach((rc: OpenF1RaceControlMsg) => {
    const ts = rc.date ? new Date(rc.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/race_control", data: rc, timestamp: ts })
    }
  })

  // Add weather messages.
  weatherRes.data.forEach((w: OpenF1WeatherMsg) => {
    const ts = w.date ? new Date(w.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/weather", data: w, timestamp: ts })
    }
  })

  // Add sampled car_data messages.
  allCarData.forEach((cd: OpenF1CarDataMsg) => {
    const ts = cd.date ? new Date(cd.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/car_data", data: cd, timestamp: ts })
    }
  })

  // Sort chronologically.
  messages.sort((a, b) => a.timestamp - b.timestamp)

  log.info(`${messages.length} total messages in activity window`)

  // Use the window end as the session end for synthetic clock generation.
  const sessionEndTs = windowEndMs

  // Generate synthetic clock events covering just the activity window.
  const syntheticClock = generateSyntheticClock(messages, sessionEndTs)
  log.info(`${syntheticClock.length} synthetic clock events generated`)

  // Safety trim — cap to fit in a single MongoDB document (6MB limit).
  // Data is already windowed so this should rarely truncate.
  const trimmed = trimToSnapshot(messages, activityMidpointMs)

  // Find the last data timestamp in the trimmed window.
  const dataMessages = trimmed.filter(m => !PREAMBLE_TOPICS.has(m.topic))
  const lastDataTs = dataMessages.length > 0 ? dataMessages[dataMessages.length - 1].timestamp : 0
  const clockInRange = syntheticClock.filter(e => e.timestamp <= lastDataTs)

  // Append a final clock event at the end so the frontend freezes when data runs out.
  if (clockInRange.length > 0) {
    const lastClock = clockInRange[clockInRange.length - 1]
    clockInRange.push({
      topic: "synthetic:clock",
      data: { remainingMs: lastClock.data.remainingMs, running: false },
      timestamp: lastDataTs,
    })
  }

  // Merge clock events into the data and re-sort.
  const withClock = [...trimmed, ...clockInRange]
  withClock.sort((a, b) => a.timestamp - b.timestamp)

  log.info(`${withClock.length} messages after trim + synthetic clock (${clockInRange.length} clock events)`)

  // Compute total laps from the maximum lap number across all drivers.
  const totalLaps = Math.max(0, ...lapsRes.data.map((l: OpenF1LapMsg) => l.lap_number))

  return { messages: withClock, circuitKey, trackName, sessionType: session.session_type || session.session_name, sessionName: session.session_name, driverCount: driverNumbers.length, sessionEndTs, totalLaps }
}

// Maximum byte size for stored messages — leaves buffer under MongoDB's 16MB BSON limit.
const MAX_STORED_BYTES = 6 * 1024 * 1024

// Approximate duration of data that fits within MAX_STORED_BYTES during a race.
// Used by computeOptimalMidpoint to score only the data that will survive trimming.
const EFFECTIVE_WINDOW_MS = 5 * 60 * 1000

// Exclude the first 10 minutes of the race from candidate midpoints.
// The opening laps have no pit stops and tightly-bunched cars — not ideal demo material.
const RACE_START_EXCLUSION_MS = 10 * 60 * 1000

// Topics that form the "preamble" — kept regardless of timestamp.
const PREAMBLE_TOPICS = new Set(["v1/sessions", "v1/drivers"])

// Stateful topics where we preserve the latest record per driver before the midpoint,
// so the snapshot starts with correct initial state (e.g. tyre compound, position, intervals).
const STATEFUL_TOPICS = new Set(["v1/stints", "v1/position", "v1/intervals"])

// Low-volume topics where we preserve ALL records before the midpoint.
// Laps: needed for correct bestLapTime / driverBestLap calculations.
// Weather & race_control: provides full session context (flag history, conditions).
const FULL_HISTORY_TOPICS = new Set(["v1/laps", "v1/weather", "v1/race_control"])

// Trims a full message queue to a mid-session snapshot that fits in one document.
// Keeps session/driver preamble + latest stateful records per driver before midpoint,
// then includes all data from the midpoint onwards. Truncates from the end if needed.
// For long sessions, pass midpointOverride to align the trim with the activity window.
const trimToSnapshot = (
  messages: { topic: string; data: unknown; timestamp: number }[],
  midpointOverride?: number,
): { topic: string; data: unknown; timestamp: number }[] => {
  if (messages.length === 0) return messages

  // Use override if provided (long sessions), otherwise compute from message range.
  const firstTs = messages[0].timestamp
  const lastTs = messages[messages.length - 1].timestamp
  const midTs = midpointOverride ?? firstTs + (lastTs - firstTs) / 2

  // Keep session/driver messages (preamble) regardless of timestamp.
  const preamble = messages.filter((m) => PREAMBLE_TOPICS.has(m.topic))

  // Extract the latest stateful record per driver before midpoint for each stateful topic.
  // This ensures tyre compound, position, intervals are available at snapshot start.
  const statefulPreamble: { topic: string; data: unknown; timestamp: number }[] = []

  STATEFUL_TOPICS.forEach((topic) => {
    const latestByDriver = new Map<number, { topic: string; data: unknown; timestamp: number }>()
    messages.forEach((m) => {
      if (m.topic === topic && m.timestamp < midTs) {
        const driverNumber = (m.data as Record<string, unknown>).driver_number as number
        const existing = latestByDriver.get(driverNumber)
        if (!existing || m.timestamp > existing.timestamp) {
          latestByDriver.set(driverNumber, m)
        }
      }
    })
    latestByDriver.forEach((msg) => statefulPreamble.push(msg))
  })

  // Keep ALL records before midpoint for low-volume topics (laps, weather, race_control).
  // Laps: needed for correct bestLapTime / driverBestLap calculations.
  // Weather & race_control: provides full session context at snapshot start.
  const fullHistoryPreamble = messages.filter((m) =>
    FULL_HISTORY_TOPICS.has(m.topic) && m.timestamp < midTs,
  )

  // Keep all remaining messages from the midpoint onwards (excludes preamble topics).
  let dataMessages = messages.filter((m) =>
    !PREAMBLE_TOPICS.has(m.topic) && m.timestamp >= midTs,
  )

  // Truncate from the end if the combined data exceeds the safe storage limit.
  let combined = [...preamble, ...statefulPreamble, ...fullHistoryPreamble, ...dataMessages]
  let byteSize = Buffer.byteLength(JSON.stringify(combined))

  while (byteSize > MAX_STORED_BYTES && dataMessages.length > 0) {
    // Trim 20% off the end each iteration.
    dataMessages = dataMessages.slice(0, Math.floor(dataMessages.length * 0.8))
    combined = [...preamble, ...statefulPreamble, ...fullHistoryPreamble, ...dataMessages]
    byteSize = Buffer.byteLength(JSON.stringify(combined))
  }

  // Re-sort to maintain chronological order after merging preamble sections.
  combined.sort((a, b) => a.timestamp - b.timestamp)

  // Log the snapshot window duration.
  if (dataMessages.length > 0) {
    const windowStart = dataMessages[0].timestamp
    const windowEnd = dataMessages[dataMessages.length - 1].timestamp
    const durationMins = ((windowEnd - windowStart) / 60000).toFixed(1)
    log.info(`Snapshot window: ${durationMins} mins of session data (~${(byteSize / 1024 / 1024).toFixed(1)}MB)`)
  }

  return combined
}

// Builds a pit lane profile from replay messages by analyzing telemetry around pit stops.
// Extracts pit events, car_data (speed), and GPS locations from the message queue,
// correlates them to detect pit entry/exit points and which side of the track the pit is on.
const buildPitLaneProfile = (
  messages: { topic: string; data: unknown; timestamp: number }[],
  trackPath: { x: number; y: number }[],
  arcLengths: number[],
): PitLaneProfile | null => {
  // Extract relevant messages from the queue.
  const pitStops: (OpenF1PitMsg & { ts: number })[] = []
  const carDataByDriver = new Map<number, { speed: number; ts: number }[]>()
  const locationsByDriver = new Map<number, { x: number; y: number; ts: number }[]>()

  for (const msg of messages) {
    if (msg.topic === "v1/pit") {
      const pit = msg.data as OpenF1PitMsg
      pitStops.push({ ...pit, ts: msg.timestamp })
    } else if (msg.topic === "v1/car_data") {
      const cd = msg.data as OpenF1CarDataMsg
      const arr = carDataByDriver.get(cd.driver_number) ?? []
      arr.push({ speed: cd.speed, ts: msg.timestamp })
      carDataByDriver.set(cd.driver_number, arr)
    } else if (msg.topic === "v1/location") {
      const loc = msg.data as OpenF1LocationMsg
      const arr = locationsByDriver.get(loc.driver_number) ?? []
      arr.push({ x: loc.x, y: loc.y, ts: msg.timestamp })
      locationsByDriver.set(loc.driver_number, arr)
    }
  }

  if (pitStops.length === 0 || trackPath.length < 2) return null

  // Finds the nearest GPS location to a target timestamp within a 5s tolerance.
  const findNearestLocation = (
    targetTs: number,
    driverLocations: { x: number; y: number; ts: number }[],
  ) => {
    let best = driverLocations[0]
    let bestDist = Math.abs(driverLocations[0].ts - targetTs)
    for (const loc of driverLocations) {
      const dist = Math.abs(loc.ts - targetTs)
      if (dist < bestDist) {
        bestDist = dist
        best = loc
      }
    }
    return bestDist < 5000 ? best : null
  }

  const exitSpeedSamples: number[] = []
  const pitLaneSpeeds: number[] = []
  const pitSideVotes: { side: number; rightWeight: number; leftWeight: number; totalPoints: number }[] = []
  const looseEntryProgressSamples: number[] = []
  const looseExitProgressSamples: number[] = []

  // ── Phase 1: Collect pit lane speeds, pit side votes, and loose entry/exit progress ──
  // Uses loose thresholds to define the time window for each pit stop.
  // Tight entry/exit is refined in Phase 2 using the detected speed limit.

  // Per-pit-stop data needed by Phase 2 (loose entry/exit timestamps + window car data).
  const pitStopWindows: {
    pit: typeof pitStops[0]
    windowCarData: { speed: number; ts: number }[]
    driverLocations: { x: number; y: number; ts: number }[]
    entryTs: number
    exitTs: number
  }[] = []

  for (const pit of pitStops) {
    const driverCarData = carDataByDriver.get(pit.driver_number)
    const driverLocations = locationsByDriver.get(pit.driver_number)
    if (!driverCarData || !driverLocations) continue

    // Time window around this pit stop.
    const pitDuration = pit.pit_duration ?? 60000
    const windowStart = pit.ts - pitDuration - 15000
    const windowEnd = pit.ts + 30000

    // Filter car_data in the time window.
    const windowCarData = driverCarData.filter(cd => cd.ts >= windowStart && cd.ts <= windowEnd)
    if (windowCarData.length < 5) continue

    // Find loose entry: scan forward to find where speed drops below 100 km/h.
    let entryIdx = -1
    for (let i = 1; i < windowCarData.length; i++) {
      if (windowCarData[i - 1].speed > 120 && windowCarData[i].speed < 100) {
        entryIdx = i
        break
      }
    }

    // Find loose exit: scan from pit.ts forward to find where speed rises above 100 km/h.
    let exitIdx = -1
    for (let i = 0; i < windowCarData.length; i++) {
      if (windowCarData[i].ts >= pit.ts && windowCarData[i].speed > 100) {
        exitIdx = i
        break
      }
    }

    if (exitIdx >= 0) exitSpeedSamples.push(windowCarData[exitIdx].speed)

    // Collect loose entry/exit progress as fallback for sparse data (practice/qualifying).
    if (entryIdx >= 0) {
      const loc = findNearestLocation(windowCarData[entryIdx].ts, driverLocations)
      if (loc) looseEntryProgressSamples.push(computeTrackProgress(loc.x, loc.y, trackPath, arcLengths))
    }
    if (exitIdx >= 0) {
      const loc = findNearestLocation(windowCarData[exitIdx].ts, driverLocations)
      if (loc) looseExitProgressSamples.push(computeTrackProgress(loc.x, loc.y, trackPath, arcLengths))
    }

    // Collect pit lane speeds (between loose entry and exit, moving but in pit lane).
    const entryTs = entryIdx >= 0 ? windowCarData[entryIdx].ts : pit.ts - pitDuration
    const exitTs = exitIdx >= 0 ? windowCarData[exitIdx].ts : pit.ts
    for (const cd of windowCarData) {
      if (cd.ts >= entryTs && cd.ts <= exitTs && cd.speed > 20 && cd.speed < 120) {
        pitLaneSpeeds.push(cd.speed)
      }
    }

    // Determine pit side: use shared perpendicular analysis on GPS positions while in pit lane.
    // Cross-reference each GPS position with the nearest car_data sample to attach approximate speed.
    // Speed filtering excludes positions where the car is still at racing speed (entry/exit transitions).
    const pitLocationsWithSpeed = driverLocations
      .filter(loc => loc.ts >= entryTs && loc.ts <= exitTs)
      .map(loc => {
        let nearestSpeed: number | undefined
        let minDist = Infinity
        for (const cd of windowCarData) {
          const dist = Math.abs(cd.ts - loc.ts)
          if (dist < minDist) { minDist = dist; nearestSpeed = cd.speed }
        }
        return { x: loc.x, y: loc.y, speed: minDist < 5000 ? nearestSpeed : undefined }
      })
    if (pitLocationsWithSpeed.length > 0) {
      const voteResult = computePitSideVote(pitLocationsWithSpeed, trackPath)
      // Only include pit stops with clear agreement (>60% one side).
      // Ambiguous votes from noisy GPS would pollute the aggregate.
      const totalW = voteResult.rightWeight + voteResult.leftWeight
      if (totalW > 0 && Math.max(voteResult.rightWeight, voteResult.leftWeight) / totalW >= 0.6) {
        pitSideVotes.push(voteResult)
      }
    }

    // Save window data for Phase 2.
    pitStopWindows.push({ pit, windowCarData, driverLocations, entryTs, exitTs })
  }

  // Detect pit lane speed limit from speed distribution.
  const binSize = 5
  const bins = new Map<number, number>()
  for (const s of pitLaneSpeeds) {
    const bin = Math.round(s / binSize) * binSize
    bins.set(bin, (bins.get(bin) ?? 0) + 1)
  }
  let detectedLimit = 80
  let bestBinCount = 0
  bins.forEach((count, bin) => {
    if (count > bestBinCount) {
      bestBinCount = count
      detectedLimit = bin
    }
  })

  // ── Phase 2: Find tight entry/exit using the detected speed limit ──
  // Instead of using the loose braking/acceleration thresholds, find where cars are
  // actually traveling at the pit lane speed limit — this represents the pit building area.
  const tightLimit = detectedLimit + PIT_SPEED_MARGIN
  const entryProgressSamples: number[] = []
  const exitProgressSamples: number[] = []

  for (const { pit, windowCarData, driverLocations, entryTs } of pitStopWindows) {
    // Tight entry: first sample at or below pit lane speed (+margin) after approach begins.
    let tightEntryIdx = -1
    for (let i = 0; i < windowCarData.length; i++) {
      if (windowCarData[i].ts < entryTs - 5000) continue
      if (windowCarData[i].speed <= tightLimit && windowCarData[i].speed > 10) {
        tightEntryIdx = i
        break
      }
    }

    // Tight exit: last sample at or below pit lane speed (+margin) after the pit stop.
    let tightExitIdx = -1
    for (let i = windowCarData.length - 1; i >= 0; i--) {
      if (windowCarData[i].ts < pit.ts) continue
      if (windowCarData[i].speed <= tightLimit && windowCarData[i].speed > 10) {
        tightExitIdx = i
        break
      }
    }

    // Map tight timestamps to GPS and compute track progress.
    if (tightEntryIdx >= 0) {
      const loc = findNearestLocation(windowCarData[tightEntryIdx].ts, driverLocations)
      if (loc) entryProgressSamples.push(computeTrackProgress(loc.x, loc.y, trackPath, arcLengths))
    }
    if (tightExitIdx >= 0) {
      const loc = findNearestLocation(windowCarData[tightExitIdx].ts, driverLocations)
      if (loc) exitProgressSamples.push(computeTrackProgress(loc.x, loc.y, trackPath, arcLengths))
    }
  }

  // Need at least some entry/exit samples from either tight or loose detection.
  if (entryProgressSamples.length === 0 && looseEntryProgressSamples.length === 0) return null
  if (exitProgressSamples.length === 0 && looseExitProgressSamples.length === 0) return null

  // Determine pit side from distance-weighted GPS votes across all pit stops.
  // Points further from the racing line carry more weight (deeper in pit lane = more reliable).
  const totalRight = pitSideVotes.reduce((sum, v) => sum + v.rightWeight, 0)
  const totalLeft = pitSideVotes.reduce((sum, v) => sum + v.leftWeight, 0)
  const totalWeight = totalRight + totalLeft
  const pitSide = totalRight >= totalLeft ? 1 : -1
  let pitSideConfidence = totalWeight > 0 ? Math.max(totalRight, totalLeft) / totalWeight : 0

  // Validate GPS-based pit side against the track centroid heuristic.
  // The pit lane is virtually always on the infield side of the circuit (between the
  // main straight and the track centroid). If GPS disagrees, halve confidence.
  const pitMidProgress = (() => {
    const avgEntry = entryProgressSamples.length > 0 ? circularMedian(entryProgressSamples) : circularMedian(looseEntryProgressSamples)
    const avgExit = exitProgressSamples.length > 0 ? circularMedian(exitProgressSamples) : circularMedian(looseExitProgressSamples)
    return avgExit < avgEntry ? ((avgEntry + avgExit + 1) / 2) % 1.0 : (avgEntry + avgExit) / 2
  })()
  const infieldSide = computeInfieldSide(trackPath, arcLengths, pitMidProgress)
  if (pitSide !== infieldSide) {
    log.warn(`Pit side (${pitSide > 0 ? "right" : "left"}) disagrees with infield heuristic (${infieldSide > 0 ? "right" : "left"}) — GPS votes may be unreliable`)
    pitSideConfidence *= 0.5
  }

  // Validate tight bounds — if the range is implausibly narrow (sparse data in practice/qualifying),
  // fall back to Phase 1 loose bounds which capture the full deceleration/acceleration zone.
  const tightEntry = entryProgressSamples.length > 0 ? circularMedian(entryProgressSamples) : -1
  const tightExit = exitProgressSamples.length > 0 ? circularMedian(exitProgressSamples) : -1
  let tightRange = tightExit - tightEntry
  if (tightRange <= 0) tightRange += 1.0

  const useTight = tightEntry >= 0 && tightExit >= 0 && tightRange >= MIN_PIT_PROGRESS_RANGE

  let finalEntry: number
  let finalExit: number
  if (useTight) {
    finalEntry = tightEntry
    finalExit = tightExit
  } else if (looseEntryProgressSamples.length > 0 && looseExitProgressSamples.length > 0) {
    finalEntry = circularMedian(looseEntryProgressSamples)
    finalExit = circularMedian(looseExitProgressSamples)
    log.info(`Tight pit bounds too narrow (${(tightRange * 100).toFixed(1)}%), using loose bounds`)
  } else {
    return null
  }

  const profile: PitLaneProfile = {
    entryProgress: finalEntry,
    exitProgress: finalExit,
    exitSpeed: exitSpeedSamples.length > 0 ? median(exitSpeedSamples) : detectedLimit + 20,
    pitLaneMaxSpeed: pitLaneSpeeds.length > 0 ? Math.max(...pitLaneSpeeds) : detectedLimit,
    pitLaneSpeedLimit: detectedLimit,
    pitSide,
    pitSideConfidence,
    samplesCollected: pitStops.length,
    referenceWindingCW: isClockwise(trackPath),
  }

  const totalVotePoints = pitSideVotes.reduce((sum, v) => sum + v.totalPoints, 0)
  log.info(`Built pit lane profile: entry=${profile.entryProgress.toFixed(3)}, exit=${profile.exitProgress.toFixed(3)}, side=${pitSide > 0 ? "right" : "left"} (${(pitSideConfidence * 100).toFixed(0)}% confidence, R=${totalRight.toFixed(1)}/L=${totalLeft.toFixed(1)} from ${totalVotePoints} GPS points), limit=${detectedLimit} km/h, exitSpeed=${profile.exitSpeed.toFixed(0)} km/h (${pitStops.length} pit stops)`)

  return profile
}

// Loads or fetches the message queue for a given session.
// Checks the unified F1Session cache first; fetches from OpenF1 API and caches if not found.
const loadMessages = async (
  sessionKey: number,
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; circuitKey: number | null; trackName: string; sessionEndTs: number; sessionType: string; totalLaps: number | null }> => {
  // Check unified F1Session cache first.
  const cached = await loadDemoSession(sessionKey)
  if (cached) {
    const msgs = cached.messages as { topic: string; data: unknown; timestamp: number }[]
    log.info(`Loaded ${msgs.length} messages from cache`)
    return { messages: msgs, circuitKey: cached.circuitKey, trackName: cached.trackName, sessionEndTs: cached.sessionEndTs, sessionType: cached.sessionType, totalLaps: cached.totalLaps }
  }

  // Fetch lightweight session metadata from OpenF1 for path resolution and preamble.
  const token = await getOpenF1Token()
  const sessionRes = await axios.get<OpenF1SessionMsg[]>(
    `${OPENF1_API_BASE}/sessions?session_key=${sessionKey}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const sessionMeta = sessionRes.data.length > 0 ? sessionRes.data[0] : null

  // Try F1 static files first (richer data, free for historical sessions).
  if (sessionMeta) {
    const currentYear = new Date().getFullYear()
    const staticPath = await resolveSessionPath(
      sessionKey, currentYear,
      sessionMeta.date_start ?? undefined, sessionMeta.session_name,
    )

    if (staticPath) {
      log.info(`Trying static files: ${staticPath}`)
      const staticMessages = await fetchStaticSession(staticPath)

      if (staticMessages && staticMessages.length > 0) {
        const meetingKey = sessionMeta.meeting_key ?? 0
        const circuitKey = sessionMeta.circuit_key ?? null
        const trackName = sessionMeta.circuit_short_name || sessionMeta.session_name

        // Convert SignalR-format static messages to OpenF1 replay format.
        const converted = convertStaticToOpenF1(staticMessages, sessionKey, meetingKey)

        if (converted.length > 0) {
          log.info(`Converted ${converted.length} messages from static files`)

          // Inject session preamble message so the replay has session context.
          const firstTs = converted[0].timestamp
          const sessionPreamble: OpenF1SessionMsg = { ...sessionMeta, status: "Started" }
          converted.unshift({ topic: "v1/sessions", data: sessionPreamble, timestamp: firstTs - 200 })

          // Find the optimal midpoint for windowed trimming, balancing track activity
          // and pit stop coverage so the retained window captures pit lane telemetry.
          const lastTs = converted[converted.length - 1].timestamp
          const sessionEndTs = lastTs
          const lapTs = converted
            .filter(m => m.topic === "v1/laps" && (m.data as Record<string, unknown>).date_start)
            .map(m => new Date((m.data as Record<string, unknown>).date_start as string).getTime())
            .sort((a, b) => a - b)
          const pitTs = converted
            .filter(m => m.topic === "v1/pit" && (m.data as Record<string, unknown>).date)
            .map(m => new Date((m.data as Record<string, unknown>).date as string).getTime())
            .sort((a, b) => a - b)
          const midTs = computeOptimalMidpoint(
            lapTs, pitTs, firstTs + (lastTs - firstTs) / 2,
          )

          // Generate synthetic clock events from the full converted data.
          const syntheticClock = generateSyntheticClock(converted, sessionEndTs)
          log.info(`${syntheticClock.length} synthetic clock events generated`)

          // Trim to fit within a single MongoDB document.
          const trimmed = trimToSnapshot(converted, midTs)

          // Filter clock events to match the trimmed data range.
          const dataMessages = trimmed.filter(m => !PREAMBLE_TOPICS.has(m.topic))
          const lastDataTs = dataMessages.length > 0 ? dataMessages[dataMessages.length - 1].timestamp : 0
          const clockInRange = syntheticClock.filter(e => e.timestamp <= lastDataTs)

          // Append a final clock event so the frontend freezes when data runs out.
          if (clockInRange.length > 0) {
            const lastClock = clockInRange[clockInRange.length - 1]
            clockInRange.push({
              topic: "synthetic:clock",
              data: { remainingMs: lastClock.data.remainingMs, running: false },
              timestamp: lastDataTs,
            })
          }

          // Merge clock events into the data and re-sort.
          const withClock = [...trimmed, ...clockInRange]
          withClock.sort((a, b) => a.timestamp - b.timestamp)

          log.info(`${withClock.length} messages after trim + synthetic clock`)

          // Count unique drivers for the cache record.
          const driverNumbers = new Set<number>()
          for (const msg of withClock) {
            if (msg.topic === "v1/drivers") {
              const d = msg.data as { driver_number?: number }
              if (d.driver_number) driverNumbers.add(d.driver_number)
            }
          }

          // Compute total laps from the converted lap messages.
          const staticTotalLaps = Math.max(0, ...converted
            .filter(m => m.topic === "v1/laps")
            .map(m => (m.data as { lap_number: number }).lap_number),
          )

          // Save to the unified F1Session cache.
          await saveDemoSession(
            sessionKey, meetingKey, circuitKey, trackName,
            sessionMeta.session_type ?? sessionMeta.session_name, sessionMeta.session_name,
            driverNumbers.size, sessionEndTs,
            withClock as ReplayMessage[],
            staticTotalLaps || null,
          )

          const resolvedSessionType = sessionMeta.session_type ?? sessionMeta.session_name
          return { messages: withClock, circuitKey, trackName, sessionEndTs, sessionType: resolvedSessionType, totalLaps: staticTotalLaps }
        }
      }
    }
  }

  // Fetch from OpenF1 REST API (fallback when static files unavailable).
  log.info("Fetching from OpenF1 API...")
  const result = await fetchFromAPI(sessionKey)

  if (result.messages.length === 0) {
    throw new Error("No replay messages generated")
  }

  log.info(`${result.messages.length} messages queued for replay`)

  // Save to the unified F1Session model.
  const sessionMsg = result.messages.find((m) => m.topic === "v1/sessions")
  const meetingKey = sessionMsg ? (sessionMsg.data as Record<string, unknown>).meeting_key as number : 0

  await saveDemoSession(
    sessionKey,
    meetingKey,
    result.circuitKey,
    result.trackName,
    result.sessionType,
    result.sessionName,
    result.driverCount,
    result.sessionEndTs,
    result.messages as ReplayMessage[],
    result.totalLaps || null,
  )

  return { messages: result.messages, circuitKey: result.circuitKey, trackName: result.trackName, sessionEndTs: result.sessionEndTs, sessionType: result.sessionType, totalLaps: result.totalLaps }
}

// Starts a demo replay by loading cached data or fetching from the API.
export const startDemoReplay = async (
  sessionKey?: number,
  speed?: number,
): Promise<DemoStatus> => {
  // Always stop any existing or initializing replay.
  stopDemoReplay()

  // Increment generation so any in-flight async work from a prior call aborts.
  replayGeneration++
  const thisGeneration = replayGeneration

  replaySessionKey = sessionKey || DEFAULT_SESSION_KEY
  replaySpeed = speed || 4

  log.info(`Starting demo replay for session ${replaySessionKey} at ${replaySpeed}x speed...`)

  // Notify frontend that data is being fetched.
  emitDemoPhase("fetching")

  try {
    const { messages, circuitKey, trackName, sessionType, totalLaps } = await loadMessages(replaySessionKey)
    replayTrackName = trackName

    // Find the first position message to determine the preamble boundary.
    const firstPositionIdx = messages.findIndex((m) => m.topic === "v1/location")
    const preambleEnd = firstPositionIdx > 0 ? firstPositionIdx : 0

    // Extract drivers from preamble messages.
    const drivers = new Map<number, DriverInfo>()
    for (let i = 0; i < preambleEnd; i++) {
      const msg = messages[i]
      if (msg.topic === "v1/drivers") {
        const d = msg.data as OpenF1DriverMsg
        drivers.set(d.driver_number, {
          driverNumber: d.driver_number,
          nameAcronym: d.name_acronym,
          fullName: d.full_name,
          teamName: d.team_name,
          teamColour: d.team_colour,
          headshotUrl: d.headshot_url || null,
        })
      }
    }

    // Build GPS track from the current demo's data. This ensures the GPS baseline
    // in MongoDB matches the current session's coordinate system. Skips instantly
    // if already built from the same session key.
    await buildTrackFromDemoData(messages, trackName, replaySessionKey)

    // Initialize session — loads trackmap from MongoDB (GPS path now matches current session).
    await initDemoSession(replaySessionKey, trackName, circuitKey, drivers, sessionType, totalLaps)

    // Build or refine pit lane profile from telemetry data if not yet settled.
    const existingTrackmap = await Trackmap.findOne({ trackName })
    const existingSamples = existingTrackmap?.pitLaneProfile?.samplesCollected ?? 0
    if (existingSamples < MAX_PIT_SAMPLES && existingTrackmap?.path && existingTrackmap.path.length > 0) {
      const trackPath = existingTrackmap.path.map(p => ({ x: p.x, y: p.y }))
      const arcLens = computeArcLengths(trackPath)
      const profile = buildPitLaneProfile(messages, trackPath, arcLens)
      if (profile) {
        // Keep whichever profile has more samples (existing vs newly built).
        const existingProfile = existingTrackmap.pitLaneProfile
        if (!existingProfile || profile.samplesCollected > existingProfile.samplesCollected) {
          withDemoContext(() => setActivePitLaneProfile(profile))
          existingTrackmap.pitLaneProfile = profile
          existingTrackmap.updated_at = new Date().toISOString()
          await existingTrackmap.save()
          log.info(`✓ Saved pit lane profile to trackmap DB for "${trackName}" (${profile.samplesCollected} samples)`)
        } else {
          log.info(`Pit lane profile unchanged for "${trackName}" (existing: ${existingProfile.samplesCollected} samples, new: ${profile.samplesCollected})`)
        }
      }
    }

    // Process stateful preamble messages (stints, positions, weather, etc.) that sit
    // between driver entries and the first location message. These must be fed through
    // handleMqttMessage so sessionManager has correct initial state (tyre compounds, etc.).
    withDemoContext(() => {
      for (let i = 0; i < preambleEnd; i++) {
        const msg = messages[i]
        if (!PREAMBLE_TOPICS.has(msg.topic) && msg.topic !== "synthetic:clock") {
          handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)), true)
        }
      }
    })

    // Abort if a newer replay was started while we were loading/initializing.
    if (thisGeneration !== replayGeneration) {
      log.info("Demo replay superseded by newer request — aborting")
      return getDemoStatus()
    }

    // Fast-forward through early session until multiple drivers are on track.
    const MIN_DRIVERS_ON_TRACK = 5
    const driversSeen = new Set<number>()
    let fastForwardEnd = preambleEnd

    for (let i = preambleEnd; i < messages.length; i++) {
      if (messages[i].topic === "v1/location") {
        const loc = messages[i].data as OpenF1LocationMsg
        driversSeen.add(loc.driver_number)
        if (driversSeen.size >= MIN_DRIVERS_ON_TRACK) {
          fastForwardEnd = i
          break
        }
      }
    }

    // Process all fast-forwarded messages (positions + laps) immediately.
    // Track the latest synthetic clock event so we can emit it for initial state.
    let latestFastForwardClock: { remainingMs: number; running: boolean } | null = null
    withDemoContext(() => {
      for (let i = preambleEnd; i < fastForwardEnd; i++) {
        const msg = messages[i]
        if (msg.topic === "synthetic:clock") {
          latestFastForwardClock = msg.data as { remainingMs: number; running: boolean }
        } else {
          handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)), true)
        }
      }
    })

    // Emit the latest clock state from the fast-forwarded period so the frontend
    // starts with the correct countdown value.
    if (latestFastForwardClock !== null) {
      const clock = latestFastForwardClock as { remainingMs: number; running: boolean }
      emitToDemo(OPENF1_EVENTS.CLOCK, {
        ...clock,
        serverTs: Date.now(),
        speed: replaySpeed,
      })
    }

    // Start replay from the point where cars are on track.
    replayMessages = messages
    replayIndex = fastForwardEnd
    replayBaseTime = messages[fastForwardEnd].timestamp
    replayStartTime = Date.now()
    replayActive = true

    // Auto-stop the demo when the demo viewer disconnects or unsubscribes.
    setOnDemoStop(() => {
      log.info("Auto-stopping demo replay — demo viewer left")
      stopDemoReplay()
    })

    // Emit the trackmap now that fast-forwarded data is populated.
    // This is what stops the frontend spinner — delayed until data is ready.
    withDemoContext(() => emitDemoTrackmap())

    // Notify frontend that replay is ready (clock is now driven by synthetic:clock events).
    emitDemoPhase("ready")

    // Tick-based playback — check which messages should have been sent by now.
    replayTimer = setInterval(() => {
      // Self-destruct if a newer replay has been started (orphaned timer guard).
      if (thisGeneration !== replayGeneration) {
        clearInterval(replayTimer!)
        replayTimer = null
        return
      }

      if (!replayActive || replayIndex >= replayMessages.length) {
        log.info("Demo replay complete")
        stopDemoReplay(true)
        return
      }

      // Calculate how far we are into the replay in "session time".
      const elapsedReal = Date.now() - replayStartTime
      const elapsedSession = elapsedReal * replaySpeed
      const currentSessionTime = replayBaseTime + elapsedSession

      // Feed all messages up to the current session time within demo context
      // so sessionManager reads/writes demoState and emits to the demo socket.
      withDemoContext(() => {
        while (replayIndex < replayMessages.length && replayMessages[replayIndex].timestamp <= currentSessionTime) {
          const msg = replayMessages[replayIndex]

          // Synthetic clock events are emitted directly as session:clock.
          if (msg.topic === "synthetic:clock") {
            const clockData = msg.data as { remainingMs: number; running: boolean }
            emitToRoom(OPENF1_EVENTS.CLOCK, {
              ...clockData,
              serverTs: Date.now(),
              speed: replaySpeed,
            })
          } else {
            handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)), true)
          }

          replayIndex++
        }
      })
    }, REPLAY_TICK_INTERVAL)

    return getDemoStatus()
  } catch (err) {
    log.error("Failed to start demo replay:", err)
    replayActive = false
    emitDemoPhase("stopped")
    throw err
  }
}

// Stops the current demo replay.
// When natural=true (replay reached end of data), emits "ended" instead of "stopped".
export const stopDemoReplay = (natural = false): DemoStatus => {
  if (replayTimer) {
    clearInterval(replayTimer)
    replayTimer = null
  }

  // Unregister the demo stop callback so disconnects no longer trigger stop.
  setOnDemoStop(null)

  // Notify frontend BEFORE cleaning up — endDemoSession clears demoSocketId.
  emitDemoPhase(natural ? "ended" : "stopped")

  // Clean up the demo session state.
  if (replayActive) {
    endDemoSession()
  }

  replayActive = false
  replayMessages = []
  replayIndex = 0

  log.info(natural ? "Demo replay ended" : "Demo replay stopped")
  return getDemoStatus()
}
