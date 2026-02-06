import axios from "axios"
import { getOpenF1Token } from "./auth"
import { handleMqttMessage, emitToRoom, initDemoSession, endDemoSession, OPENF1_EVENTS } from "./sessionManager"
import { OpenF1LocationMsg, OpenF1LapMsg, OpenF1SessionMsg, OpenF1DriverMsg, DriverInfo } from "./types"
import DemoSession from "../../models/demoSession"

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Default session key for demo (2024 Bahrain GP Qualifying).
const DEFAULT_SESSION_KEY = 9158

// Interval between replay ticks (ms).
const REPLAY_TICK_INTERVAL = 50

// Replay state.
let replayTimer: ReturnType<typeof setInterval> | null = null
let replayMessages: { topic: string; data: unknown; timestamp: number }[] = []
let replayIndex = 0
let replayStartTime = 0
let replayBaseTime = 0
let replaySpeed = 2
let replayActive = false
let replaySessionKey = 0
let replayTrackName = ""

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
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; trackName: string; sessionName: string; driverCount: number; sessionEndTs: number }> => {
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
  console.log(`  Track: ${trackName}, Session: ${session.session_name}`)

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

  // Fetch position data per driver (avoids massive single request).
  const allPositions: OpenF1LocationMsg[] = []
  for (const driverNum of driverNumbers) {
    const posRes = await axios.get<OpenF1LocationMsg[]>(
      `${OPENF1_API_BASE}/location?session_key=${sessionKey}&driver_number=${driverNum}`,
      { headers: authHeaders },
    )
    allPositions.push(...posRes.data)
  }

  console.log(`  Fetched ${lapsRes.data.length} laps, ${allPositions.length} positions`)

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

  // Add position messages.
  allPositions.forEach((pos: OpenF1LocationMsg) => {
    const ts = new Date(pos.date).getTime()
    if (ts > 0) {
      messages.push({ topic: "v1/location", data: pos, timestamp: ts })
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

  return { messages: trimmed, trackName, sessionName: session.session_name, driverCount: driverNumbers.length, sessionEndTs }
}

// Maximum byte size for stored messages — leaves buffer under MongoDB's 16MB BSON limit.
const MAX_STORED_BYTES = 12 * 1024 * 1024

// Trims a full message queue to a mid-session snapshot that fits in one document.
// Discards location/lap data before the session midpoint, keeps session/driver preamble,
// then truncates from the end if the result still exceeds the safe storage limit.
const trimToSnapshot = (
  messages: { topic: string; data: unknown; timestamp: number }[],
): { topic: string; data: unknown; timestamp: number }[] => {
  if (messages.length === 0) return messages

  // Compute the session midpoint timestamp.
  const firstTs = messages[0].timestamp
  const lastTs = messages[messages.length - 1].timestamp
  const midTs = firstTs + (lastTs - firstTs) / 2

  // Keep session/driver messages (preamble) regardless of timestamp.
  const preamble = messages.filter((m) => m.topic === "v1/sessions" || m.topic === "v1/drivers")

  // Keep location/lap messages from the midpoint onwards.
  let dataMessages = messages.filter((m) =>
    m.topic !== "v1/sessions" && m.topic !== "v1/drivers" && m.timestamp >= midTs,
  )

  // Truncate from the end if the combined data exceeds the safe storage limit.
  let combined = [...preamble, ...dataMessages]
  let byteSize = Buffer.byteLength(JSON.stringify(combined))

  while (byteSize > MAX_STORED_BYTES && dataMessages.length > 0) {
    // Trim 20% off the end each iteration.
    dataMessages = dataMessages.slice(0, Math.floor(dataMessages.length * 0.8))
    combined = [...preamble, ...dataMessages]
    byteSize = Buffer.byteLength(JSON.stringify(combined))
  }

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
): Promise<{ messages: { topic: string; data: unknown; timestamp: number }[]; trackName: string; sessionEndTs: number }> => {
  // Check MongoDB cache first.
  const cached = await DemoSession.findOne({ sessionKey })
  if (cached && cached.messages.length > 0) {
    console.log(`  Loaded ${cached.messages.length} messages from cache (${cached.driverCount} drivers)`)
    return { messages: cached.messages, trackName: cached.trackName, sessionEndTs: cached.sessionEndTs }
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
    trackName: result.trackName,
    sessionName: result.sessionName,
    driverCount: result.driverCount,
    sessionEndTs: result.sessionEndTs,
    messages: result.messages,
  })
  console.log(`  Saved demo session to database`)

  return { messages: result.messages, trackName: result.trackName, sessionEndTs: result.sessionEndTs }
}

// Starts a demo replay by loading cached data or fetching from the API.
export const startDemoReplay = async (
  sessionKey?: number,
  speed?: number,
): Promise<DemoStatus> => {
  // Stop any existing replay.
  if (replayActive) {
    stopDemoReplay()
  }

  replaySessionKey = sessionKey || DEFAULT_SESSION_KEY
  replaySpeed = speed || 2

  console.log(`🎬 Starting demo replay for session ${replaySessionKey} at ${replaySpeed}x speed...`)

  // Notify frontend that data is being fetched.
  emitDemoPhase("fetching")

  try {
    const { messages, trackName, sessionEndTs } = await loadMessages(replaySessionKey)
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
        })
      }
    }

    // Initialize session directly — no OpenF1 API calls, loads trackmap from MongoDB.
    await initDemoSession(replaySessionKey, trackName, drivers)

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
