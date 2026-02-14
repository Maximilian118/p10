import axios from "axios"
import WebSocket from "ws"
import { emitToRoom, OPENF1_EVENTS } from "./sessionManager"
import {
  normalizeSignalRClock,
  normalizeSignalRStint,
  normalizeSignalRTiming,
  normalizeSignalRDriver,
  normalizeSignalRWeather,
  normalizeSignalRRaceControl,
  normalizeSignalRLapCount,
  InternalEvent,
  InternalEventType,
} from "./normalizer"
import { deepMerge } from "./utils"
import { createLogger } from "../../shared/logger"

const log = createLogger("SignalR")

const SIGNALR_BASE = "https://livetiming.formula1.com"
const SIGNALR_HUB = "Streaming"

// Flat retry interval when SignalR is unavailable (ms).
const RETRY_INTERVAL_MS = 60000

// Maximum number of connection attempts before giving up.
const MAX_RETRIES = 3

// All free SignalR topics we subscribe to.
const SIGNALR_TOPICS = [
  "Heartbeat",
  "ExtrapolatedClock",
  "TimingData",
  "TimingAppData",
  "TimingStats",
  "DriverList",
  "SessionInfo",
  "SessionStatus",
  "TrackStatus",
  "RaceControlMessages",
  "WeatherData",
  "LapCount",
  "TeamRadio",
  "SessionData",
]

// Connection state.
let ws: WebSocket | null = null
let retryTimeout: ReturnType<typeof setTimeout> | null = null
let shouldReconnect = false
let retryCount = 0

// Tracks the current connection state for the session capability report.
let connectionStatus: "connected" | "connecting" | "unavailable" = "connecting"
let lastError: string | null = null

// Tracks when each topic last delivered data (for fallback coordination).
const topicLastSeen = new Map<string, number>()

// Returns the current live timing connection status.
export const getSignalRStatus = (): { status: string; error: string | null } => ({
  status: connectionStatus,
  error: lastError,
})

// Returns a map of topic → last-seen timestamp (for OpenF1 fallback decisions).
export const getSignalRTopicTimestamps = (): ReadonlyMap<string, number> => topicLastSeen

// Latest clock state — cached so new clients can get it immediately.
let latestClock: { remainingMs: number; running: boolean; serverTs: number; speed: number } | null = null

// Returns the latest cached clock state (for initial client snapshot).
export const getLatestClock = () => latestClock

// Accumulated SignalR state, deep-merged from incremental updates per topic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signalrState: Record<string, any> = {}

// Registered event handler (set by the session manager during init).
let eventHandler: ((event: InternalEvent) => void) | null = null

// Registers a callback to receive normalized events from SignalR.
export const onSignalREvent = (handler: (event: InternalEvent) => void): void => {
  eventHandler = handler
}

// Shape of a single stint entry within TimingAppData.Lines[driver].Stints[index].
interface SignalRStintEntry {
  Compound?: string
  New?: string | boolean
  TotalLaps?: number
}

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

// Records that a topic delivered data at the current timestamp.
const markTopicSeen = (topic: string): void => {
  topicLastSeen.set(topic, Date.now())
}

// ─── Topic Handlers ──────────────────────────────────────────────

// Processes an ExtrapolatedClock update from the SignalR stream.
const handleClockUpdate = (data: { Utc?: string; Remaining?: string; Extrapolating?: boolean }) => {
  if (!data.Remaining) return
  markTopicSeen("ExtrapolatedClock")

  latestClock = {
    remainingMs: parseTimeString(data.Remaining),
    running: data.Extrapolating === true,
    serverTs: Date.now(),
    speed: 1,
  }

  emitToRoom(OPENF1_EVENTS.CLOCK, latestClock)

  // Also emit as normalized event.
  if (eventHandler) {
    eventHandler(normalizeSignalRClock(latestClock.remainingMs, latestClock.running))
  }
}

// Processes a TimingAppData update (stint/tyre information per driver).
const handleTimingAppData = (data: Record<string, unknown>) => {
  if (!signalrState.TimingAppData) signalrState.TimingAppData = {}
  deepMerge(signalrState.TimingAppData, data)
  markTopicSeen("TimingAppData")

  const lines = signalrState.TimingAppData.Lines
  if (!lines || typeof lines !== "object") return

  // Iterate each driver in Lines (keyed by driver number string).
  for (const [driverNumStr, driverData] of Object.entries(lines as Record<string, unknown>)) {
    const driverNumber = parseInt(driverNumStr, 10)
    if (isNaN(driverNumber)) continue

    const stints = (driverData as Record<string, unknown>)?.Stints
    if (!stints || typeof stints !== "object") continue

    // Find the highest stint index (the current/active stint).
    const stintEntries = Object.entries(stints as Record<string, SignalRStintEntry>)
    if (stintEntries.length === 0) continue

    stintEntries.sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    const [latestIdx, latestStint] = stintEntries[stintEntries.length - 1]

    // Only push if we have a compound (the minimum useful data).
    if (!latestStint.Compound) continue

    const stintNumber = parseInt(latestIdx, 10) + 1
    const totalLaps = latestStint.TotalLaps ?? 0
    // SignalR sends New as "TRUE"/"FALSE" string — coerce to boolean.
    const isNew = latestStint.New === true || latestStint.New === "true" || latestStint.New === "TRUE"

    // Emit as normalized event through the unified event handler.
    if (eventHandler) {
      eventHandler(normalizeSignalRStint(driverNumber, latestStint.Compound, stintNumber, totalLaps, isNew))
    }

    // Extract grid position if available (set once at session start).
    const gridPos = (driverData as Record<string, unknown>)?.GridPos
    if (gridPos !== undefined && eventHandler) {
      eventHandler({
        type: "session_data" as InternalEventType,
        driverNumber,
        data: { key: "GridPosition", value: parseInt(gridPos as string, 10) },
        timestamp: Date.now(),
        source: "signalr",
      })
    }
  }
}

// Processes a TimingData update (positions, gaps, sector times, speeds).
const handleTimingData = (data: Record<string, unknown>) => {
  if (!signalrState.TimingData) signalrState.TimingData = {}
  deepMerge(signalrState.TimingData, data)
  markTopicSeen("TimingData")

  const lines = signalrState.TimingData.Lines
  if (!lines || typeof lines !== "object" || !eventHandler) return

  // Extract position and gap data per driver.
  for (const [driverNumStr, driverData] of Object.entries(lines as Record<string, unknown>)) {
    const driverNumber = parseInt(driverNumStr, 10)
    if (isNaN(driverNumber)) continue

    const d = driverData as Record<string, unknown>

    // Build a timing event with whatever fields are available.
    const timingData: Record<string, unknown> = {}
    if (d.Position !== undefined) timingData.position = parseInt(d.Position as string, 10)
    if (d.GapToLeader !== undefined) timingData.gapToLeader = d.GapToLeader
    if (d.IntervalToPositionAhead !== undefined) {
      const interval = d.IntervalToPositionAhead as Record<string, unknown>
      if (interval.Value !== undefined) timingData.interval = interval.Value
    }
    if (d.TimeDiffToPositionAhead !== undefined) timingData.interval = d.TimeDiffToPositionAhead

    // Extract driver lap count and status flags from TimingData.
    if (d.NumberOfLaps !== undefined) timingData.numberOfLaps = parseInt(d.NumberOfLaps as string, 10)
    if (d.InPit !== undefined) timingData.inPit = d.InPit === true || d.InPit === "true"
    if (d.Retired !== undefined) timingData.retired = d.Retired === true || d.Retired === "true"
    if (d.Stopped !== undefined) timingData.stopped = d.Stopped === true || d.Stopped === "true"

    if (Object.keys(timingData).length > 0) {
      eventHandler(normalizeSignalRTiming(driverNumber, timingData))
    }
  }
}

// Processes a DriverList update (driver metadata).
const handleDriverList = (data: Record<string, unknown>) => {
  if (!signalrState.DriverList) signalrState.DriverList = {}
  deepMerge(signalrState.DriverList, data)
  markTopicSeen("DriverList")

  if (!eventHandler) return

  for (const [driverNumStr, driverData] of Object.entries(signalrState.DriverList as Record<string, unknown>)) {
    const driverNumber = parseInt(driverNumStr, 10)
    if (isNaN(driverNumber)) continue
    eventHandler(normalizeSignalRDriver(driverNumber, driverData as Record<string, unknown>))
  }
}

// Processes a WeatherData update.
const handleWeatherData = (data: Record<string, unknown>) => {
  markTopicSeen("WeatherData")
  if (eventHandler) {
    eventHandler(normalizeSignalRWeather(data))
  }
}

// Processes a RaceControlMessages update.
const handleRaceControlMessages = (data: Record<string, unknown>) => {
  markTopicSeen("RaceControlMessages")
  if (!eventHandler) return

  // RaceControlMessages comes as { Messages: { "0": {...}, "1": {...} } }
  const messages = data.Messages as Record<string, Record<string, unknown>> | undefined
  if (!messages) return

  // Deep-merge to get the full accumulated state.
  if (!signalrState.RaceControlMessages) signalrState.RaceControlMessages = {}
  deepMerge(signalrState.RaceControlMessages, data)

  // Emit new entries.
  for (const [, msgData] of Object.entries(messages)) {
    eventHandler(normalizeSignalRRaceControl(msgData))
  }
}

// Processes a TrackStatus update (flag state).
const handleTrackStatus = (data: Record<string, unknown>) => {
  markTopicSeen("TrackStatus")
  if (!eventHandler) return

  // TrackStatus has { Status: "1"|"2"|"4"|"5"|"6"|"7", Message: "AllClear"|"Yellow"|"SCDeployed"|"Red"|"VSCDeployed"|"VSCEnding"|"GreenFlag" }
  const status = data.Status as string
  const message = data.Message as string
  if (status) {
    const flagMap: Record<string, string> = {
      "1": "GREEN", "2": "YELLOW", "4": "SC", "5": "RED", "6": "VSC", "7": "VSC_ENDING",
    }
    eventHandler(normalizeSignalRRaceControl({
      Utc: new Date().toISOString(),
      Category: "Flag",
      Message: message || `Track Status ${status}`,
      Flag: flagMap[status] || null,
      Scope: "Track",
    }))
  }
}

// Processes a LapCount update (current/total laps for races).
const handleLapCount = (data: Record<string, unknown>) => {
  markTopicSeen("LapCount")
  if (eventHandler) {
    eventHandler(normalizeSignalRLapCount(data))
  }
}

// Processes a SessionInfo update.
const handleSessionInfo = (data: Record<string, unknown>) => {
  markTopicSeen("SessionInfo")
  // SessionInfo contains meeting name, path for static files, etc.
  // Stored in signalrState for reference.
  if (!signalrState.SessionInfo) signalrState.SessionInfo = {}
  deepMerge(signalrState.SessionInfo, data)
}

// Processes a SessionStatus update.
const handleSessionStatus = (data: Record<string, unknown>) => {
  markTopicSeen("SessionStatus")
  if (!signalrState.SessionStatus) signalrState.SessionStatus = {}
  deepMerge(signalrState.SessionStatus, data)
}

// Processes a TimingStats update.
const handleTimingStats = (data: Record<string, unknown>) => {
  markTopicSeen("TimingStats")
  if (!signalrState.TimingStats) signalrState.TimingStats = {}
  deepMerge(signalrState.TimingStats, data)
}

// Processes a TeamRadio update. Extracts radio capture events and emits them.
const handleTeamRadio = (data: Record<string, unknown>) => {
  markTopicSeen("TeamRadio")
  if (!eventHandler) return

  if (!signalrState.TeamRadio) signalrState.TeamRadio = {}
  deepMerge(signalrState.TeamRadio, data)

  // TeamRadio format: { Captures: { "0": { Utc, RacingNumber, Path }, ... } }
  const captures = data.Captures as Record<string, Record<string, unknown>> | undefined
  if (!captures) return

  for (const [, capture] of Object.entries(captures)) {
    const driverNumber = capture.RacingNumber ? parseInt(capture.RacingNumber as string, 10) : 0
    if (!driverNumber) continue

    eventHandler({
      type: "team_radio" as InternalEventType,
      driverNumber,
      data: {
        date: (capture.Utc as string) ?? new Date().toISOString(),
        driverNumber,
        audioUrl: capture.Path ? `https://livetiming.formula1.com/static/${capture.Path}` : "",
      },
      timestamp: Date.now(),
      source: "signalr",
    })
  }
}

// Processes a SessionData update. Extracts session events and emits them.
const handleSessionData = (data: Record<string, unknown>) => {
  markTopicSeen("SessionData")
  if (!signalrState.SessionData) signalrState.SessionData = {}
  deepMerge(signalrState.SessionData, data)

  if (!eventHandler) return

  // SessionData format: { Series: [ { Utc, Key, Value }, ... ] }
  const series = data.Series as Record<string, unknown>[] | undefined
  if (!series || !Array.isArray(series)) return

  for (const entry of series) {
    eventHandler({
      type: "session_data" as InternalEventType,
      data: {
        date: (entry.Utc as string) ?? new Date().toISOString(),
        key: (entry.Key as string) ?? "",
        value: entry.Value ?? "",
      },
      timestamp: Date.now(),
      source: "signalr",
    })
  }
}

// ─── Message Router ──────────────────────────────────────────────

// Routes a topic update to the appropriate handler.
const routeTopic = (topic: string, data: unknown): void => {
  switch (topic) {
    case "ExtrapolatedClock":
      handleClockUpdate(data as { Utc?: string; Remaining?: string; Extrapolating?: boolean })
      break
    case "TimingAppData":
      handleTimingAppData(data as Record<string, unknown>)
      break
    case "TimingData":
      handleTimingData(data as Record<string, unknown>)
      break
    case "DriverList":
      handleDriverList(data as Record<string, unknown>)
      break
    case "WeatherData":
      handleWeatherData(data as Record<string, unknown>)
      break
    case "RaceControlMessages":
      handleRaceControlMessages(data as Record<string, unknown>)
      break
    case "TrackStatus":
      handleTrackStatus(data as Record<string, unknown>)
      break
    case "LapCount":
      handleLapCount(data as Record<string, unknown>)
      break
    case "SessionInfo":
      handleSessionInfo(data as Record<string, unknown>)
      break
    case "SessionStatus":
      handleSessionStatus(data as Record<string, unknown>)
      break
    case "TimingStats":
      handleTimingStats(data as Record<string, unknown>)
      break
    case "Heartbeat":
      markTopicSeen("Heartbeat")
      break
    case "TeamRadio":
      handleTeamRadio(data as Record<string, unknown>)
      break
    case "SessionData":
      handleSessionData(data as Record<string, unknown>)
      break
  }
}

// Parses incoming SignalR messages and routes topic updates to handlers.
const handleMessage = (raw: string) => {
  try {
    const msg = JSON.parse(raw)

    // SignalR streaming updates come in the M array.
    if (msg.M && Array.isArray(msg.M)) {
      for (const item of msg.M) {
        if (!item.A || !Array.isArray(item.A) || item.A.length < 2) continue
        routeTopic(item.A[0], item.A[1])
      }
    }

    // Initial state response after subscribing (keyed by topic name).
    if (msg.R) {
      for (const [topic, data] of Object.entries(msg.R as Record<string, unknown>)) {
        if (data && typeof data === "object") {
          routeTopic(topic, data)
        }
      }
    }
  } catch {
    // Ignore non-JSON messages (keepalives, etc.)
  }
}

// ─── Connection Management ───────────────────────────────────────

// Connects to the F1 Live Timing SignalR endpoint and subscribes to all free topics.
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
      log.info(`✓ Connected (subscribing to ${SIGNALR_TOPICS.length} topics)`)
      connectionStatus = "connected"
      lastError = null
      retryCount = 0

      // Step 3: Subscribe to all free topics.
      const subscribeMsg = JSON.stringify({
        H: SIGNALR_HUB,
        M: "Subscribe",
        A: [SIGNALR_TOPICS],
        I: "1",
      })
      ws?.send(subscribeMsg)
    })

    ws.on("message", (data) => {
      handleMessage(data.toString())
    })

    ws.on("close", () => {
      log.info("⚠ Connection closed")
      connectionStatus = "connecting"
      ws = null
      scheduleReconnect()
    })

    ws.on("error", (err) => {
      log.error("✗ WebSocket error:", err.message)
      ws?.close()
    })
  } catch (err: unknown) {
    retryCount++
    const gaveUp = retryCount >= MAX_RETRIES
    const suffix = gaveUp ? `(giving up after ${MAX_RETRIES} attempts)` : "(retrying in 60s)"

    if (axios.isAxiosError(err) && err.response) {
      const { status, statusText, data } = err.response
      const body = typeof data === "string" ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100)
      lastError = `${status} ${statusText}`
      log.warn(`Negotiate failed: ${status} ${statusText} — "${body}" ${suffix}`)
    } else {
      lastError = (err as Error).message
      log.warn(`Connection failed: ${(err as Error).message} ${suffix}`)
    }
    connectionStatus = "unavailable"
    ws = null
    if (!gaveUp) scheduleReconnect()
  }
}

// Schedules a reconnection attempt after a flat 60-second delay.
const scheduleReconnect = () => {
  if (!shouldReconnect) return
  if (retryTimeout) return

  retryTimeout = setTimeout(() => {
    retryTimeout = null
    connect()
  }, RETRY_INTERVAL_MS)
}

// ─── Public Lifecycle ────────────────────────────────────────────

// Starts the SignalR connection. Called when a live session begins.
export const connectSignalR = (): void => {
  shouldReconnect = true
  retryCount = 0
  latestClock = null
  connectionStatus = "connecting"
  lastError = null
  topicLastSeen.clear()

  // Reset accumulated state.
  for (const key of Object.keys(signalrState)) {
    delete signalrState[key]
  }

  connect()
}

// Disconnects from SignalR. Called when a session ends.
export const disconnectSignalR = (): void => {
  shouldReconnect = false
  latestClock = null
  connectionStatus = "connecting"
  lastError = null
  topicLastSeen.clear()

  // Reset accumulated state.
  for (const key of Object.keys(signalrState)) {
    delete signalrState[key]
  }

  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }

  if (ws) {
    ws.close()
    ws = null
  }

  log.info("✓ Disconnected")
}

// ─── Backwards Compat Aliases ─────────────────────────────────────

// These aliases maintain API compatibility with code that imported from f1LiveTiming.ts.
export const connectLiveTiming = connectSignalR
export const disconnectLiveTiming = disconnectSignalR
export const getLiveTimingStatus = getSignalRStatus
