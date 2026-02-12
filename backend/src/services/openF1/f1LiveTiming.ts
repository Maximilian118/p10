import axios from "axios"
import WebSocket from "ws"
import { emitToRoom, OPENF1_EVENTS } from "./sessionManager"

const SIGNALR_BASE = "https://livetiming.formula1.com"
const SIGNALR_HUB = "Streaming"

// Reconnection parameters.
const INITIAL_RETRY_MS = 2000
const MAX_RETRY_MS = 30000

// Connection state.
let ws: WebSocket | null = null
let retryTimeout: ReturnType<typeof setTimeout> | null = null
let retryDelay = INITIAL_RETRY_MS
let shouldReconnect = false

// Latest clock state — cached so new clients can get it immediately.
let latestClock: { remainingMs: number; running: boolean; serverTs: number; speed: number } | null = null

// Returns the latest cached clock state (for initial client snapshot).
export const getLatestClock = () => latestClock

// Parses a time string "HH:MM:SS" or "MM:SS" into milliseconds.
const parseTimeString = (time: string): number => {
  const parts = time.split(":").map(Number)
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
  }
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000
  }
  return 0
}

// Processes an ExtrapolatedClock update from the SignalR stream.
const handleClockUpdate = (data: { Utc?: string; Remaining?: string; Extrapolating?: boolean }) => {
  if (!data.Remaining) return

  latestClock = {
    remainingMs: parseTimeString(data.Remaining),
    running: data.Extrapolating === true,
    serverTs: Date.now(),
    speed: 1,
  }

  emitToRoom(OPENF1_EVENTS.CLOCK, latestClock)
}

// Parses incoming SignalR messages and extracts ExtrapolatedClock updates.
const handleMessage = (raw: string) => {
  try {
    const msg = JSON.parse(raw)

    // SignalR update messages come in the M array.
    if (msg.M && Array.isArray(msg.M)) {
      for (const item of msg.M) {
        if (item.A && item.A[0] === "ExtrapolatedClock") {
          handleClockUpdate(item.A[1])
        }
      }
    }

    // Initial state response after subscribing (keyed by topic name).
    if (msg.R && msg.R.ExtrapolatedClock) {
      handleClockUpdate(msg.R.ExtrapolatedClock)
    }
  } catch {
    // Ignore non-JSON messages (keepalives, etc.)
  }
}

// Connects to the F1 Live Timing SignalR endpoint and subscribes to ExtrapolatedClock.
const connect = async (): Promise<void> => {
  try {
    // Step 1: Negotiate to get connection token and session cookie.
    const connectionData = encodeURIComponent(JSON.stringify([{ name: SIGNALR_HUB }]))
    const negotiateUrl = `${SIGNALR_BASE}/negotiate?clientProtocol=1.5&connectionData=${connectionData}`

    const negotiateRes = await axios.get(negotiateUrl, {
      headers: { "User-Agent": "BestHTTP" },
    })

    const connectionToken = encodeURIComponent(negotiateRes.data.ConnectionToken)
    const cookies = (negotiateRes.headers["set-cookie"] || []).map((c: string) => c.split(";")[0]).join("; ")

    // Step 2: Open WebSocket connection.
    const connectUrl = `wss://livetiming.formula1.com/connect?clientProtocol=1.5&transport=webSockets&connectionToken=${connectionToken}&connectionData=${connectionData}`

    ws = new WebSocket(connectUrl, {
      headers: {
        "User-Agent": "BestHTTP",
        "Accept-Encoding": "gzip,identity",
        Cookie: cookies,
      },
    })

    ws.on("open", () => {
      console.log("✓ Connected to F1 Live Timing SignalR")
      retryDelay = INITIAL_RETRY_MS

      // Step 3: Subscribe to ExtrapolatedClock topic.
      const subscribeMsg = JSON.stringify({
        H: SIGNALR_HUB,
        M: "Subscribe",
        A: [["ExtrapolatedClock"]],
        I: "1",
      })
      ws?.send(subscribeMsg)
    })

    ws.on("message", (data) => {
      handleMessage(data.toString())
    })

    ws.on("close", () => {
      console.log("⚠ F1 Live Timing connection closed")
      ws = null
      scheduleReconnect()
    })

    ws.on("error", (err) => {
      console.error("✗ F1 Live Timing WebSocket error:", err.message)
      ws?.close()
    })
  } catch (err) {
    console.error("✗ Failed to connect to F1 Live Timing:", (err as Error).message)
    ws = null
    scheduleReconnect()
  }
}

// Schedules a reconnection attempt with exponential backoff.
const scheduleReconnect = () => {
  if (!shouldReconnect) return
  if (retryTimeout) return

  console.log(`  Reconnecting to F1 Live Timing in ${retryDelay / 1000}s...`)
  retryTimeout = setTimeout(() => {
    retryTimeout = null
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS)
    connect()
  }, retryDelay)
}

// Starts the F1 Live Timing connection. Called when a live session begins.
export const connectLiveTiming = (): void => {
  shouldReconnect = true
  latestClock = null
  connect()
}

// Disconnects from F1 Live Timing. Called when a session ends.
export const disconnectLiveTiming = (): void => {
  shouldReconnect = false
  latestClock = null

  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }

  if (ws) {
    ws.close()
    ws = null
  }

  console.log("✓ Disconnected from F1 Live Timing")
}
