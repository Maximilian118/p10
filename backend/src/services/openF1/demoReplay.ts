import axios from "axios"
import { getOpenF1Token } from "./auth"
import { handleMqttMessage, emitToRoom, initDemoSession, endDemoSession, emitDemoTrackmap, buildTrackFromDemoData, OPENF1_EVENTS } from "./sessionManager"
import {
  OpenF1LocationMsg, OpenF1LapMsg, OpenF1SessionMsg, OpenF1DriverMsg, DriverInfo,
  OpenF1CarDataMsg, OpenF1IntervalMsg, OpenF1PitMsg, OpenF1StintMsg,
  OpenF1PositionMsg, OpenF1RaceControlMsg, OpenF1WeatherMsg,
} from "./types"
import DemoSession from "../../models/demoSession"
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

// Emits a demo phase update to all connected clients.
const emitDemoPhase = (phase: "fetching" | "ready" | "stopped" | "ended"): void => {
  emitToRoom(OPENF1_EVENTS.DEMO_STATUS, { phase })
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

  // Extract race control flag events (RED/GREEN) from the full dataset.
  const flagEvents: { ts: number; flag: string }[] = []
  for (const msg of messages) {
    if (msg.topic === "v1/race_control") {
      const rc = msg.data as { flag?: string | null }
      if (rc.flag === "RED" || rc.flag === "GREEN") {
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

// Fetches all session data from the OpenF1 REST API and builds the message queue.
const fetchFromAPI = async (
  sessionKey: number,
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; circuitKey: number | null; trackName: string; sessionName: string; driverCount: number; sessionEndTs: number }> => {
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

  // Find the activity midpoint from lap timestamps — the busiest part of the session.
  // All other endpoints are fetched only within a tight window around this point,
  // giving the demo a true slice of the live session with fast API responses.
  const lapTimestamps = lapsRes.data
    .filter((l: OpenF1LapMsg) => l.date_start)
    .map((l: OpenF1LapMsg) => new Date(l.date_start!).getTime())
    .sort((a: number, b: number) => a - b)

  const activityMidpointMs = lapTimestamps.length > 0
    ? lapTimestamps[Math.floor(lapTimestamps.length / 2)]
    : new Date(session.date_start || Date.now()).getTime()

  // 2 min buffer before + 10 min after = ~8 min of data (2 min at 4x speed).
  const windowStartMs = activityMidpointMs - 2 * 60 * 1000
  const windowEndMs = activityMidpointMs + 10 * 60 * 1000
  const windowStartISO = new Date(windowStartMs).toISOString()
  const windowEndISO = new Date(windowEndMs).toISOString()
  const dateFilter = `&date>=${windowStartISO}&date<=${windowEndISO}`

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

  // Fetch interval data within the activity window.
  const intervalsRes = await axios.get<OpenF1IntervalMsg[]>(
    `${OPENF1_API_BASE}/intervals?session_key=${sessionKey}${dateFilter}`,
    { headers: authHeaders },
  )

  // Fetch race position data within the activity window.
  const positionRes = await axios.get<OpenF1PositionMsg[]>(
    `${OPENF1_API_BASE}/position?session_key=${sessionKey}${dateFilter}`,
    { headers: authHeaders },
  )

  // Fetch stint data (no date field in API — fetched in full, filtered later).
  const stintsRes = await axios.get<OpenF1StintMsg[]>(
    `${OPENF1_API_BASE}/stints?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch pit stop data within the activity window.
  const pitRes = await axios.get<OpenF1PitMsg[]>(
    `${OPENF1_API_BASE}/pit?session_key=${sessionKey}${dateFilter}`,
    { headers: authHeaders },
  )

  // Fetch race control messages within the activity window.
  const raceControlRes = await axios.get<OpenF1RaceControlMsg[]>(
    `${OPENF1_API_BASE}/race_control?session_key=${sessionKey}${dateFilter}`,
    { headers: authHeaders },
  )

  // Fetch weather data within the activity window.
  const weatherRes = await axios.get<OpenF1WeatherMsg[]>(
    `${OPENF1_API_BASE}/weather?session_key=${sessionKey}${dateFilter}`,
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

  // Add lap messages (filtered to the activity window).
  lapsRes.data.forEach((lap: OpenF1LapMsg) => {
    const ts = lap.date_start ? new Date(lap.date_start).getTime() : 0
    if (ts >= windowStartMs && ts <= windowEndMs) {
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

  // Add stint messages (no date field — inject at window start so latest per-driver is available).
  stintsRes.data.forEach((stint: OpenF1StintMsg) => {
    messages.push({ topic: "v1/stints", data: stint, timestamp: windowStartMs + stint.stint_number * 100 + stint.lap_start })
  })

  // Add pit messages.
  pitRes.data.forEach((pit: OpenF1PitMsg) => {
    const ts = pit.date ? new Date(pit.date).getTime() : 0
    if (ts > 0) {
      messages.push({ topic: "v1/pit", data: pit, timestamp: ts })
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

  return { messages: withClock, circuitKey, trackName, sessionName: session.session_name, driverCount: driverNumbers.length, sessionEndTs }
}

// Maximum byte size for stored messages — leaves buffer under MongoDB's 16MB BSON limit.
const MAX_STORED_BYTES = 6 * 1024 * 1024

// Topics that form the "preamble" — kept regardless of timestamp.
const PREAMBLE_TOPICS = new Set(["v1/sessions", "v1/drivers"])

// Stateful topics where we preserve the latest record per driver before the midpoint,
// so the snapshot starts with correct initial state (e.g. tyre compound, position).
const STATEFUL_TOPICS = new Set(["v1/stints", "v1/position"])

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
  // This ensures tyre compound, position, etc. are available at snapshot start.
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

  // Keep the latest weather record before midpoint so weather is available at start.
  const weatherBefore = messages.filter((m) => m.topic === "v1/weather" && m.timestamp < midTs)
  if (weatherBefore.length > 0) {
    statefulPreamble.push(weatherBefore[weatherBefore.length - 1])
  }

  // Keep all non-preamble, non-stateful-preamble messages from the midpoint onwards.
  let dataMessages = messages.filter((m) =>
    !PREAMBLE_TOPICS.has(m.topic) && m.timestamp >= midTs,
  )

  // Truncate from the end if the combined data exceeds the safe storage limit.
  let combined = [...preamble, ...statefulPreamble, ...dataMessages]
  let byteSize = Buffer.byteLength(JSON.stringify(combined))

  while (byteSize > MAX_STORED_BYTES && dataMessages.length > 0) {
    // Trim 20% off the end each iteration.
    dataMessages = dataMessages.slice(0, Math.floor(dataMessages.length * 0.8))
    combined = [...preamble, ...statefulPreamble, ...dataMessages]
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

// Loads or fetches the message queue for a given session.
// Checks MongoDB cache first; fetches from OpenF1 API and caches if not found.
const loadMessages = async (
  sessionKey: number,
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; circuitKey: number | null; trackName: string; sessionEndTs: number }> => {
  // Check MongoDB cache first.
  const cached = await DemoSession.findOne({ sessionKey })
  if (cached && cached.messages.length > 0) {
    // Check if cached data includes the expanded topics (car_data, position, etc.)
    // and synthetic clock events. If missing, the cache is stale and needs a re-fetch.
    const hasExpandedTopics = cached.messages.some((m) => m.topic === "v1/car_data")
    const hasSyntheticClock = cached.messages.some((m) => m.topic === "synthetic:clock")

    if (hasExpandedTopics && hasSyntheticClock) {
      log.info(`Loaded ${cached.messages.length} messages from cache (${cached.driverCount} drivers)`)

      // Extract circuit key from the document, or fall back to the cached session message
      // for documents that predate the circuitKey field.
      let circuitKey: number | null = cached.circuitKey || null
      if (!circuitKey) {
        const sessionMsg = cached.messages.find((m) => m.topic === "v1/sessions")
        if (sessionMsg) {
          circuitKey = (sessionMsg.data as Record<string, unknown>).circuit_key as number ?? null
        }
      }

      return { messages: cached.messages, circuitKey, trackName: cached.trackName, sessionEndTs: cached.sessionEndTs }
    }

    // Stale cache — delete and re-fetch with all topics + synthetic clock.
    log.info("Stale cache (missing expanded topics or synthetic clock) — re-fetching from API...")
    await DemoSession.deleteOne({ sessionKey })
  }

  // Not cached — fetch from OpenF1 API.
  log.info("No cache found, fetching from OpenF1 API...")
  const result = await fetchFromAPI(sessionKey)

  if (result.messages.length === 0) {
    throw new Error("No replay messages generated")
  }

  log.info(`${result.messages.length} messages queued for replay`)

  // Save the trimmed snapshot as a single document.
  await DemoSession.create({
    sessionKey,
    circuitKey: result.circuitKey ?? 0,
    trackName: result.trackName,
    sessionName: result.sessionName,
    driverCount: result.driverCount,
    sessionEndTs: result.sessionEndTs,
    messages: result.messages,
  })
  log.info("Saved demo session to database")

  return { messages: result.messages, circuitKey: result.circuitKey, trackName: result.trackName, sessionEndTs: result.sessionEndTs }
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
    const { messages, circuitKey, trackName } = await loadMessages(replaySessionKey)
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
    await initDemoSession(replaySessionKey, trackName, circuitKey, drivers)

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
    for (let i = preambleEnd; i < fastForwardEnd; i++) {
      const msg = messages[i]
      if (msg.topic === "synthetic:clock") {
        latestFastForwardClock = msg.data as { remainingMs: number; running: boolean }
      } else {
        handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)))
      }
    }

    // Emit the latest clock state from the fast-forwarded period so the frontend
    // starts with the correct countdown value.
    if (latestFastForwardClock) {
      emitToRoom(OPENF1_EVENTS.CLOCK, {
        ...latestFastForwardClock,
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

    // Emit the trackmap now that fast-forwarded data is populated.
    // This is what stops the frontend spinner — delayed until data is ready.
    emitDemoTrackmap()

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

      // Feed all messages up to the current session time.
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
          handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)))
        }

        replayIndex++
      }
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

  // Clean up the demo session state.
  if (replayActive) {
    endDemoSession()
  }

  replayActive = false
  replayMessages = []
  replayIndex = 0

  // Notify frontend — "ended" for natural completion, "stopped" for user-initiated.
  emitDemoPhase(natural ? "ended" : "stopped")

  log.info(natural ? "Demo replay ended" : "Demo replay stopped")
  return getDemoStatus()
}
