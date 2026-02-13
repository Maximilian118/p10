import { Server } from "socket.io"
import { connectMqtt, onMqttMessage } from "./mqttClient"
import { initSessionManager, handleMqttMessage, checkForActiveSession, startSessionPolling } from "./sessionManager"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

// Initializes the OpenF1 service: connects to MQTT, starts session management,
// and checks for any currently active session (in case of backend restart).
export const initializeOpenF1Service = async (io: Server): Promise<void> => {
  // Check if OpenF1 credentials are configured.
  if (!process.env.OPENF1_USERNAME || !process.env.OPENF1_PASSWORD) {
    log.warn("⚠ Credentials not configured — live F1 data disabled")
    return
  }

  try {
    // Initialize session manager with Socket.IO reference.
    initSessionManager(io)

    // Register the message handler before connecting.
    onMqttMessage(handleMqttMessage)

    // Connect to OpenF1 MQTT broker.
    await connectMqtt()

    // Check if there's already an active session (backend restart recovery).
    const sessionFound = await checkForActiveSession()
    if (!sessionFound) log.info("ℹ No active session detected")

    // Start periodic polling to catch sessions MQTT may miss.
    startSessionPolling()

    log.info("✓ Service initialized")
  } catch (err) {
    log.error("✗ Failed to initialize service:", err)
    log.warn("  Live F1 data will be unavailable until next restart")
  }
}
