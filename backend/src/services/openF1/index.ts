import { Server } from "socket.io"
import { connectMqtt, onMqttMessage } from "./openf1Client"
import { initSessionManager, handleMqttMessage, handleLiveSignalREvent, checkForActiveSession, startSessionPolling } from "./sessionManager"
import { onSignalREvent } from "./signalrClient"
import { startQualifyingSchedulePolling } from "./qualifyingSchedule"
import { startRoundAutomation } from "./roundAutomation"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

// Initializes the OpenF1 service: connects to MQTT and SignalR, starts session management,
// qualifying schedule polling, round automation, and checks for any currently active session.
export const initializeOpenF1Service = async (io: Server): Promise<void> => {
  // Check if OpenF1 credentials are configured.
  if (!process.env.OPENF1_USERNAME || !process.env.OPENF1_PASSWORD) {
    log.warn("⚠ Credentials not configured — live F1 data disabled")
    return
  }

  try {
    // Initialize session manager with Socket.IO reference.
    initSessionManager(io)

    // Register message handlers for both data sources.
    onMqttMessage(handleMqttMessage)
    onSignalREvent(handleLiveSignalREvent)

    // Connect to OpenF1 MQTT broker.
    await connectMqtt()

    // Check if there's already an active session (backend restart recovery).
    const sessionFound = await checkForActiveSession()
    if (!sessionFound) log.info("ℹ No active session detected")

    // Start periodic polling to catch sessions MQTT may miss.
    startSessionPolling()

    // Start qualifying schedule polling (fetches next qualifying start time every hour).
    startQualifyingSchedulePolling(io)

    // Start round automation (checks every 30s if any championship needs auto-opening).
    startRoundAutomation(io)

    log.info("✓ Service initialized")
  } catch (err) {
    log.error("✗ Failed to initialize service:", err)
    log.warn("  Live F1 data will be unavailable until next restart")
  }
}
