import axios from "axios"
import { getOpenF1Token } from "./auth"
import { handleMqttMessage } from "./sessionManager"
import { OpenF1LocationMsg, OpenF1LapMsg, OpenF1SessionMsg, OpenF1DriverMsg } from "./types"

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Default session key for demo (2024 Bahrain GP Qualifying).
const DEFAULT_SESSION_KEY = 9158

// Number of drivers to fetch position data for (keeps REST calls manageable).
const DEMO_DRIVER_COUNT = 5

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

// Starts a demo replay by fetching historical data and playing it back.
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

  try {
    const token = await getOpenF1Token()
    const authHeaders = { Authorization: `Bearer ${token}` }

    // Fetch session info.
    const sessionRes = await axios.get<OpenF1SessionMsg[]>(
      `${OPENF1_API_BASE}/sessions?session_key=${replaySessionKey}`,
      { headers: authHeaders },
    )

    if (sessionRes.data.length === 0) {
      throw new Error(`No session found for key ${replaySessionKey}`)
    }

    const session = sessionRes.data[0]
    replayTrackName = session.circuit_short_name || session.session_name
    console.log(`  Track: ${replayTrackName}, Session: ${session.session_name}`)

    // Fetch drivers for this session.
    const driversRes = await axios.get<OpenF1DriverMsg[]>(
      `${OPENF1_API_BASE}/drivers?session_key=${replaySessionKey}`,
      { headers: authHeaders },
    )

    const allDrivers = driversRes.data
    // Pick a subset of drivers for position data.
    const demoDrivers = allDrivers.slice(0, DEMO_DRIVER_COUNT)
    const demoDriverNumbers = demoDrivers.map((d: OpenF1DriverMsg) => d.driver_number)

    console.log(`  Fetching data for ${demoDriverNumbers.length} drivers: ${demoDriverNumbers.join(", ")}`)

    // Fetch lap data for all drivers.
    const lapsRes = await axios.get<OpenF1LapMsg[]>(
      `${OPENF1_API_BASE}/laps?session_key=${replaySessionKey}`,
      { headers: authHeaders },
    )

    // Fetch position data per driver (avoids massive single request).
    const allPositions: OpenF1LocationMsg[] = []
    for (const driverNum of demoDriverNumbers) {
      const posRes = await axios.get<OpenF1LocationMsg[]>(
        `${OPENF1_API_BASE}/location?session_key=${replaySessionKey}&driver_number=${driverNum}`,
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
      // Only include laps from our demo drivers.
      if (!demoDriverNumbers.includes(lap.driver_number)) return
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

    if (messages.length === 0) {
      throw new Error("No replay messages generated")
    }

    console.log(`  ${messages.length} total messages queued for replay`)

    // Start replay.
    replayMessages = messages
    replayIndex = 0
    replayBaseTime = messages[0].timestamp
    replayStartTime = Date.now()
    replayActive = true

    // Tick-based playback — check which messages should have been sent by now.
    replayTimer = setInterval(() => {
      if (!replayActive || replayIndex >= replayMessages.length) {
        console.log("🏁 Demo replay complete")
        stopDemoReplay()
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
    throw err
  }
}

// Stops the current demo replay.
export const stopDemoReplay = (): DemoStatus => {
  if (replayTimer) {
    clearInterval(replayTimer)
    replayTimer = null
  }

  // Send a session end message to clean up.
  if (replayActive && replayMessages.length > 0) {
    const sessionMsg = replayMessages.find((m) => m.topic === "v1/sessions")
    if (sessionMsg) {
      const endMsg = { ...(sessionMsg.data as OpenF1SessionMsg), status: "Finalised" }
      handleMqttMessage("v1/sessions", Buffer.from(JSON.stringify(endMsg)))
    }
  }

  replayActive = false
  replayMessages = []
  replayIndex = 0

  console.log("⏹ Demo replay stopped")
  return getDemoStatus()
}
