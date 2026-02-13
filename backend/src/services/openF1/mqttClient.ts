import mqtt, { MqttClient } from "mqtt"
import { getOpenF1Token, clearOpenF1Token } from "./auth"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

const OPENF1_WS_URL = "wss://mqtt.openf1.org:8084/mqtt"

// Topics to subscribe to for live session data.
const TOPICS = [
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

// Singleton MQTT client instance.
let client: MqttClient | null = null

// Tracks which topics have been successfully subscribed.
const subscribedTopics = new Set<string>()

// Returns which MQTT topics are currently subscribed.
export const getSubscribedTopics = (): ReadonlySet<string> => subscribedTopics

// Message handler registered by the session manager.
let messageHandler: ((topic: string, payload: Buffer) => void) | null = null

// Registers a callback to receive all incoming MQTT messages.
export const onMqttMessage = (handler: (topic: string, payload: Buffer) => void): void => {
  messageHandler = handler
}

// Connects to OpenF1 MQTT broker via WebSocket.
// Subscribes to all required topics and routes messages to the registered handler.
export const connectMqtt = async (): Promise<void> => {
  // Disconnect existing client if any.
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

    // Subscribe to all topics and log a single summary when all results are in.
    let completed = 0
    const failed: string[] = []

    TOPICS.forEach((topic) => {
      client!.subscribe(topic, (err) => {
        completed++
        if (err) {
          failed.push(topic.replace("v1/", ""))
        } else {
          subscribedTopics.add(topic)
        }

        // Log only if some subscriptions failed.
        if (completed === TOPICS.length && failed.length > 0) {
          log.info(`Subscribed to ${TOPICS.length - failed.length}/${TOPICS.length} topics (failed: ${failed.join(", ")})`)
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
    log.error(" ✗ MQTT error:", err.message)
  })

  client.on("close", () => {
    log.info(" ⚠ MQTT connection closed")
  })

  client.on("reconnect", () => {
    log.info(" ↻ MQTT reconnecting...")
    // Refresh token on reconnection in case it expired.
    getOpenF1Token()
      .then((newToken) => {
        if (client) {
          client.options.password = newToken
        }
      })
      .catch((err) => {
        log.error(" ✗ Failed to refresh token on reconnect:", err.message)
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

// Returns whether the MQTT client is currently connected.
export const isMqttConnected = (): boolean => {
  return client !== null && client.connected
}
