import mqtt, { MqttClient } from "mqtt"
import axios from "axios"
import { getOpenF1Token, clearOpenF1Token } from "./auth"
// SignalR topic timestamps are consumed by sessionManager for source priority decisions.
// This import is available for future per-topic fallback logic within the client itself.
// import { getSignalRTopicTimestamps } from "./signalrClient"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

const OPENF1_WS_URL = "wss://mqtt.openf1.org:8084/mqtt"
const OPENF1_API_BASE = "https://api.openf1.org/v1"

// ─── Topic Classification ─────────────────────────────────────────

// All MQTT topics to subscribe to.
const ALL_TOPICS = [
  "v1/location",
  "v1/laps",
  "v1/sessions",
  "v1/drivers",
  "v1/car_data",
  "v1/intervals",
  "v1/pit",
  "v1/stints",
  "v1/position",
  "v1/race_control",
  "v1/weather",
  "v1/overtakes",
]

// Topics that are OpenF1-exclusive (paywalled on SignalR or unavailable).
// These always flow through regardless of SignalR status.
const EXCLUSIVE_TOPICS = new Set(["v1/location", "v1/car_data", "v1/pit", "v1/overtakes"])

// Topics that overlap with SignalR and should only be used as fallback.
// When SignalR is delivering these, OpenF1 data is suppressed (handled in sessionManager).
const FALLBACK_TOPICS = new Set(["v1/intervals", "v1/stints", "v1/weather", "v1/race_control"])

// Topics that are always needed from OpenF1 (session detection, driver info, laps, positions).
const ALWAYS_TOPICS = new Set(["v1/sessions", "v1/drivers", "v1/laps", "v1/position"])

// ─── REST Polling ─────────────────────────────────────────────────

// Polling intervals per endpoint (ms).
const POLL_INTERVALS: Record<string, number> = {
  car_data: 2000,
  intervals: 4000,
  pit: 10000,
  stints: 10000,
  position: 4000,
  race_control: 5000,
  weather: 60000,
  overtakes: 10000,
}

// Grace period before starting REST polling for a topic (ms).
const MQTT_GRACE_PERIOD = 15000

// Continuous data topics — should always have MQTT data flowing during a session.
const CONTINUOUS_TOPICS = new Set(["car_data", "intervals", "position", "weather"])

// Event-driven topics — only produce data when events occur.
const EVENT_TOPICS = new Set(["pit", "stints", "race_control", "overtakes"])

// Tracks which topics have received MQTT messages (polling is skipped for these).
const mqttReceived = new Set<string>()

// Active polling timers keyed by endpoint name.
const pollingTimers = new Map<string, ReturnType<typeof setInterval>>()

// Registered message handler (set by the session manager).
let messageHandler: ((topic: string, payload: Buffer) => void) | null = null

// Registered polled message handler (for REST data in parsed format).
let polledMessageHandler: ((topic: string, data: unknown) => void) | null = null

// ─── MQTT Client ──────────────────────────────────────────────────

// Singleton MQTT client instance.
let client: MqttClient | null = null

// Tracks which topics have been successfully subscribed.
const subscribedTopics = new Set<string>()

// Returns which MQTT topics are currently subscribed.
export const getSubscribedTopics = (): ReadonlySet<string> => subscribedTopics

// Registers a callback to receive all incoming MQTT messages.
export const onMqttMessage = (handler: (topic: string, payload: Buffer) => void): void => {
  messageHandler = handler
}

// Returns whether the MQTT client is currently connected.
export const isMqttConnected = (): boolean => {
  return client !== null && client.connected
}

// Connects to OpenF1 MQTT broker via WebSocket.
export const connectMqtt = async (): Promise<void> => {
  if (client) {
    client.end(true)
    client = null
  }

  const token = await getOpenF1Token()

  client = mqtt.connect(OPENF1_WS_URL, {
    username: process.env.OPENF1_USERNAME || "",
    password: token,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  })

  client.on("connect", () => {
    log.info("✓ Connected to MQTT broker")
    subscribedTopics.clear()

    let completed = 0
    const failed: string[] = []

    ALL_TOPICS.forEach((topic) => {
      client!.subscribe(topic, (err) => {
        completed++
        if (err) {
          failed.push(topic.replace("v1/", ""))
        } else {
          subscribedTopics.add(topic)
        }
        if (completed === ALL_TOPICS.length && failed.length > 0) {
          log.info(`Subscribed to ${ALL_TOPICS.length - failed.length}/${ALL_TOPICS.length} topics (failed: ${failed.join(", ")})`)
        }
      })
    })
  })

  client.on("message", (topic, payload) => {
    if (messageHandler) {
      messageHandler(topic, payload)
    }
  })

  client.on("error", (err) => {
    log.error("✗ MQTT error:", err.message)
  })

  client.on("close", () => {
    log.info("⚠ MQTT connection closed")
  })

  client.on("reconnect", () => {
    log.info("↻ MQTT reconnecting...")
    getOpenF1Token()
      .then((newToken) => {
        if (client) {
          client.options.password = newToken
        }
      })
      .catch((err) => {
        log.error("✗ Failed to refresh token on reconnect:", err.message)
        clearOpenF1Token()
      })
  })
}

// Disconnects from the OpenF1 MQTT broker.
export const disconnectMqtt = (): void => {
  if (client) {
    client.end(true)
    client = null
    subscribedTopics.clear()
    log.info("Disconnected from MQTT broker")
  }
}

// ─── REST Polling Fallback ────────────────────────────────────────

// Registers a callback to receive polled data in the same format as MQTT messages.
export const onPolledMessage = (handler: (topic: string, data: unknown) => void): void => {
  polledMessageHandler = handler
}

// Returns the current data source status for each endpoint.
export const getPollingStatus = (): { mqttActive: string[]; restPolling: string[]; eventBased: string[] } => {
  const active = Array.from(mqttReceived)
  const polling = Array.from(pollingTimers.keys())
  const awaiting = Array.from(EVENT_TOPICS).filter(
    (t) => !mqttReceived.has(t) && !pollingTimers.has(t),
  )
  return { mqttActive: active, restPolling: polling, eventBased: awaiting }
}

// Marks a topic as having received MQTT data (disables REST polling for it).
export const markMqttReceived = (topic: string): void => {
  const endpoint = topic.replace("v1/", "")
  mqttReceived.add(endpoint)

  const timer = pollingTimers.get(endpoint)
  if (timer) {
    clearInterval(timer)
    pollingTimers.delete(endpoint)
    log.info(`↻ Stopped REST polling for ${endpoint} (MQTT active)`)
  }
}

// Starts REST polling fallback for endpoints that haven't received MQTT data.
export const startPolling = (sessionKey: number): void => {
  const endpoints = Object.keys(POLL_INTERVALS)

  endpoints.forEach((endpoint) => {
    setTimeout(() => {
      if (mqttReceived.has(endpoint)) return
      if (pollingTimers.has(endpoint)) return

      if (CONTINUOUS_TOPICS.has(endpoint)) {
        log.info(`No MQTT data for ${endpoint} — starting REST polling`)
      } else {
        log.verbose(`REST polling ready for ${endpoint} (event-based, awaiting first event)`)
      }
      startEndpointPolling(endpoint, sessionKey)
    }, MQTT_GRACE_PERIOD)
  })
}

// Polls a single endpoint at the configured interval.
const startEndpointPolling = (endpoint: string, sessionKey: number): void => {
  const interval = POLL_INTERVALS[endpoint]
  if (!interval) return

  pollEndpoint(endpoint, sessionKey)

  const timer = setInterval(() => {
    if (mqttReceived.has(endpoint)) {
      clearInterval(timer)
      pollingTimers.delete(endpoint)
      return
    }
    pollEndpoint(endpoint, sessionKey)
  }, interval)

  pollingTimers.set(endpoint, timer)
}

// Fetches the latest data from a single endpoint and routes through the message handler.
const pollEndpoint = async (endpoint: string, sessionKey: number): Promise<void> => {
  if (!polledMessageHandler) return

  try {
    const token = await getOpenF1Token()
    const url = `${OPENF1_API_BASE}/${endpoint}?session_key=${sessionKey}`
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = res.data
    if (!Array.isArray(data)) return

    const topic = `v1/${endpoint}`
    data.forEach((record: unknown) => {
      polledMessageHandler!(topic, record)
    })
  } catch {
    // Silently ignore polling errors — MQTT is the primary data source.
  }
}

// Stops all active REST pollers and resets state.
export const stopPolling = (): void => {
  pollingTimers.forEach((timer) => clearInterval(timer))
  pollingTimers.clear()
  mqttReceived.clear()
}

// ─── Topic Classification Exports ─────────────────────────────────

// Returns whether the given topic is OpenF1-exclusive (paywalled on SignalR).
export const isExclusiveTopic = (topic: string): boolean => EXCLUSIVE_TOPICS.has(topic)

// Returns whether the given topic overlaps with SignalR (used as fallback only).
export const isFallbackTopic = (topic: string): boolean => FALLBACK_TOPICS.has(topic)

// Returns whether the given topic is always needed from OpenF1.
export const isAlwaysTopic = (topic: string): boolean => ALWAYS_TOPICS.has(topic)
