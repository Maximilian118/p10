import axios from "axios"
import { getOpenF1Token } from "./auth"
import { handleMqttMessage, emitToRoom, initDemoSession, endDemoSession, buildTrackFromDemoData, OPENF1_EVENTS } from "./sessionManager"
import {
  OpenF1LocationMsg, OpenF1LapMsg, OpenF1SessionMsg, OpenF1DriverMsg, DriverInfo,
  OpenF1CarDataMsg, OpenF1IntervalMsg, OpenF1PitMsg, OpenF1StintMsg,
  OpenF1PositionMsg, OpenF1RaceControlMsg, OpenF1WeatherMsg,
} from "./types"
import DemoSession from "../../models/demoSession"

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
  console.log(`  Track: ${trackName}, Session: ${session.session_name}, Circuit Key: ${circuitKey}`)

  // Fetch all drivers for this session.
  const driversRes = await axios.get<OpenF1DriverMsg[]>(
    `${OPENF1_API_BASE}/drivers?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  const allDrivers = driversRes.data
  const driverNumbers = allDrivers.map((d: OpenF1DriverMsg) => d.driver_number)

  console.log(`  Fetching data for ${driverNumbers.length} drivers: ${driverNumbers.join(", ")}`)

  // Fetch lap data for all drivers.
  const lapsRes = await axios.get<OpenF1LapMsg[]>(
    `${OPENF1_API_BASE}/laps?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch location (GPS) data per driver (avoids massive single request).
  const allLocations: OpenF1LocationMsg[] = []
  for (const driverNum of driverNumbers) {
    const locRes = await axios.get<OpenF1LocationMsg[]>(
      `${OPENF1_API_BASE}/location?session_key=${sessionKey}&driver_number=${driverNum}`,
      { headers: authHeaders },
    )
    allLocations.push(...locRes.data)
  }

  // Fetch interval data (gap to leader + interval to car ahead).
  const intervalsRes = await axios.get<OpenF1IntervalMsg[]>(
    `${OPENF1_API_BASE}/intervals?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch race position data.
  const positionRes = await axios.get<OpenF1PositionMsg[]>(
    `${OPENF1_API_BASE}/position?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch stint data (tyre compound info).
  const stintsRes = await axios.get<OpenF1StintMsg[]>(
    `${OPENF1_API_BASE}/stints?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch pit stop data.
  const pitRes = await axios.get<OpenF1PitMsg[]>(
    `${OPENF1_API_BASE}/pit?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch race control messages (flags, safety car, etc).
  const raceControlRes = await axios.get<OpenF1RaceControlMsg[]>(
    `${OPENF1_API_BASE}/race_control?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch weather data.
  const weatherRes = await axios.get<OpenF1WeatherMsg[]>(
    `${OPENF1_API_BASE}/weather?session_key=${sessionKey}`,
    { headers: authHeaders },
  )

  // Fetch car telemetry per driver and sample to ~1Hz to manage data size.
  const allCarData: OpenF1CarDataMsg[] = []
  for (const driverNum of driverNumbers) {
    const carDataRes = await axios.get<OpenF1CarDataMsg[]>(
      `${OPENF1_API_BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNum}`,
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

  console.log(`  Fetched ${lapsRes.data.length} laps, ${allLocations.length} locations, ${intervalsRes.data.length} intervals, ${positionRes.data.length} positions, ${stintsRes.data.length} stints, ${pitRes.data.length} pits, ${raceControlRes.data.length} race_control, ${weatherRes.data.length} weather, ${allCarData.length} car_data (sampled)`)

  // Build a unified chronological message queue.
  const messages: { topic: string; data: unknown; timestamp: number }[] = []

  // Add a session start message first.
  const sessionStartMsg: OpenF1SessionMsg = {
    ...session,
    status: "Started",
  }
  messages.push({
    topic: "v1/sessions",
    data: sessionStartMsg,
    timestamp: new Date(session.date_start || Date.now()).getTime(),
  })

  // Add driver messages (inject early so drivers are registered).
  allDrivers.forEach((driver: OpenF1DriverMsg) => {
    messages.push({
      topic: "v1/drivers",
      data: driver,
      timestamp: new Date(session.date_start || Date.now()).getTime() + 100,
    })
  })

  // Add lap messages.
  lapsRes.data.forEach((lap: OpenF1LapMsg) => {
    const ts = lap.date_start ? new Date(lap.date_start).getTime() : 0
    if (ts > 0) {
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

  // Add stint messages (no date field — use session start + stint_number ordering).
  const sessionStartTs = new Date(session.date_start || Date.now()).getTime()
  stintsRes.data.forEach((stint: OpenF1StintMsg) => {
    messages.push({ topic: "v1/stints", data: stint, timestamp: sessionStartTs + stint.stint_number * 100 + stint.lap_start })
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

  console.log(`  ${messages.length} total messages before trimming`)

  // Trim to a mid-session snapshot: discard location/lap data before the 50% mark,
  // then cap to fit in a single MongoDB document (12MB limit with buffer).
  const trimmed = trimToSnapshot(messages)

  console.log(`  ${trimmed.length} messages after trimming to mid-session snapshot`)

  // Parse the session end timestamp for countdown calculations.
  const sessionEndTs = session.date_end ? new Date(session.date_end).getTime() : trimmed[trimmed.length - 1]?.timestamp || 0

  return { messages: trimmed, circuitKey, trackName, sessionName: session.session_name, driverCount: driverNumbers.length, sessionEndTs }
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
const trimToSnapshot = (
  messages: { topic: string; data: unknown; timestamp: number }[],
): { topic: string; data: unknown; timestamp: number }[] => {
  if (messages.length === 0) return messages

  // Compute the session midpoint timestamp.
  const firstTs = messages[0].timestamp
  const lastTs = messages[messages.length - 1].timestamp
  const midTs = firstTs + (lastTs - firstTs) / 2

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
    console.log(`  Snapshot window: ${durationMins} mins of session data (~${(byteSize / 1024 / 1024).toFixed(1)}MB)`)
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
    // Check if cached data includes the expanded topics (car_data, position, etc.).
    // If not, the cache predates the full data expansion and needs a re-fetch.
    // Uses v1/car_data as the indicator since it's present for all session types
    // (intervals are only available during races, not practice/qualifying).
    const hasExpandedTopics = cached.messages.some((m) => m.topic === "v1/car_data")

    if (hasExpandedTopics) {
      console.log(`  Loaded ${cached.messages.length} messages from cache (${cached.driverCount} drivers)`)

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

    // Stale cache — delete and re-fetch with all topics.
    console.log("  Stale cache (missing expanded topics) — re-fetching from API...")
    await DemoSession.deleteOne({ sessionKey })
  }

  // Not cached — fetch from OpenF1 API.
  console.log("  No cache found, fetching from OpenF1 API...")
  const result = await fetchFromAPI(sessionKey)

  if (result.messages.length === 0) {
    throw new Error("No replay messages generated")
  }

  console.log(`  ${result.messages.length} messages queued for replay`)

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
  console.log(`  Saved demo session to database`)

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

  console.log(`🎬 Starting demo replay for session ${replaySessionKey} at ${replaySpeed}x speed...`)

  // Notify frontend that data is being fetched.
  emitDemoPhase("fetching")

  try {
    const { messages, circuitKey, trackName, sessionEndTs } = await loadMessages(replaySessionKey)
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
      console.log("⏹ Demo replay superseded by newer request — aborting")
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
    for (let i = preambleEnd; i < fastForwardEnd; i++) {
      const msg = messages[i]
      handleMqttMessage(msg.topic, Buffer.from(JSON.stringify(msg.data)))
    }

    // Start replay from the point where cars are on track.
    replayMessages = messages
    replayIndex = fastForwardEnd
    replayBaseTime = messages[fastForwardEnd].timestamp
    replayStartTime = Date.now()
    replayActive = true

    // Calculate real-time remaining until session end (checkered flag).
    const remainingSessionMs = sessionEndTs - replayBaseTime
    const remainingMs = remainingSessionMs / replaySpeed
    emitToRoom(OPENF1_EVENTS.DEMO_STATUS, { phase: "ready", remainingMs })

    // Tick-based playback — check which messages should have been sent by now.
    replayTimer = setInterval(() => {
      // Self-destruct if a newer replay has been started (orphaned timer guard).
      if (thisGeneration !== replayGeneration) {
        clearInterval(replayTimer!)
        replayTimer = null
        return
      }

      if (!replayActive || replayIndex >= replayMessages.length) {
        console.log("🏁 Demo replay complete")
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
        const payload = Buffer.from(JSON.stringify(msg.data))
        handleMqttMessage(msg.topic, payload)
        replayIndex++
      }
    }, REPLAY_TICK_INTERVAL)

    return getDemoStatus()
  } catch (err) {
    console.error("✗ Failed to start demo replay:", err)
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

  console.log(natural ? "🏁 Demo replay ended" : "⏹ Demo replay stopped")
  return getDemoStatus()
}
