import axios from "axios"
import { getOpenF1Token } from "./auth"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

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
// If MQTT delivers data within this window, polling is skipped.
const MQTT_GRACE_PERIOD = 15000

// Continuous data topics — should always have MQTT data flowing during a session.
// Absence of data for these topics after the grace period is noteworthy.
const CONTINUOUS_TOPICS = new Set(["car_data", "intervals", "position", "weather"])

// Event-driven topics — only produce data when events occur (pit stops, overtakes, etc.).
// Having no MQTT data for these early in a session is normal behavior.
const EVENT_TOPICS = new Set(["pit", "stints", "race_control", "overtakes"])

// Tracks which topics have received MQTT messages (polling is skipped for these).
const mqttReceived = new Set<string>()

// Active polling timers keyed by endpoint name.
const pollingTimers = new Map<string, ReturnType<typeof setInterval>>()

// Registered message handler (set by the session manager).
let messageHandler: ((topic: string, data: unknown) => void) | null = null

// Registers a callback to receive polled data in the same format as MQTT messages.
export const onPolledMessage = (handler: (topic: string, data: unknown) => void): void => {
  messageHandler = handler
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
  // Extract the endpoint name from the topic (e.g. "v1/intervals" → "intervals").
  const endpoint = topic.replace("v1/", "")
  mqttReceived.add(endpoint)

  // Stop polling this endpoint if it was active.
  const timer = pollingTimers.get(endpoint)
  if (timer) {
    clearInterval(timer)
    pollingTimers.delete(endpoint)
    log.info(`↻ Stopped REST polling for ${endpoint} (MQTT active)`)
  }
}

// Starts REST polling fallback for all endpoints that haven't received MQTT data.
// Waits for the grace period before starting each poller.
export const startPolling = (sessionKey: number): void => {
  const endpoints = Object.keys(POLL_INTERVALS)

  endpoints.forEach((endpoint) => {
    // Wait for the MQTT grace period before checking if polling is needed.
    setTimeout(() => {
      if (mqttReceived.has(endpoint)) return
      if (pollingTimers.has(endpoint)) return

      // Only log visibly for continuous data topics.
      // Event-based topics naturally have no data until an event occurs.
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

  // Perform an initial fetch immediately.
  pollEndpoint(endpoint, sessionKey)

  // Then poll at the configured interval.
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

// Fetches the latest data from a single endpoint and routes it through the message handler.
const pollEndpoint = async (endpoint: string, sessionKey: number): Promise<void> => {
  if (!messageHandler) return

  try {
    const token = await getOpenF1Token()
    const url = `${OPENF1_API_BASE}/${endpoint}?session_key=${sessionKey}`
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = res.data
    if (!Array.isArray(data)) return

    // Route each record through the message handler as if it came from MQTT.
    const topic = `v1/${endpoint}`
    data.forEach((record: unknown) => {
      messageHandler!(topic, record)
    })
  } catch (err) {
    // Silently ignore polling errors — MQTT is the primary data source.
  }
}

// Stops all active REST pollers and resets state.
export const stopPolling = (): void => {
  pollingTimers.forEach((timer) => clearInterval(timer))
  pollingTimers.clear()
  mqttReceived.clear()
}
