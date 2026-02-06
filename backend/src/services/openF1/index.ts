import { Server } from "socket.io"
import { connectMqtt, onMqttMessage } from "./mqttClient"
import { initSessionManager, handleMqttMessage, checkForActiveSession } from "./sessionManager"

// Initializes the OpenF1 service: connects to MQTT, starts session management,
// and checks for any currently active session (in case of backend restart).
export const initializeOpenF1Service = async (io: Server): Promise<void> => {
  // Check if OpenF1 credentials are configured.
  if (!process.env.OPENF1_USERNAME || !process.env.OPENF1_PASSWORD) {
    console.warn("⚠ OpenF1 credentials not configured — live F1 data disabled")
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
    await checkForActiveSession()

    console.log("✓ OpenF1 service initialized")
  } catch (err) {
    console.error("✗ Failed to initialize OpenF1 service:", err)
    console.warn("  Live F1 data will be unavailable until next restart")
  }
}
