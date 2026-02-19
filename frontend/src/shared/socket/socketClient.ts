import { io, Socket } from "socket.io-client"
import { RoundStatus, DriverEntryType, CompetitorEntryType, TeamEntryType, NotificationType } from "../types"
import { getApiUrl } from "../utility"

// Socket event names - must match backend.
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_CHAMPIONSHIP: "championship:join",
  LEAVE_CHAMPIONSHIP: "championship:leave",
  PLACE_BET: "bet:place",
  // Server -> Client
  ROUND_STATUS_CHANGED: "round:status_changed",
  BET_PLACED: "bet:placed",
  BET_CONFIRMED: "bet:confirmed",
  BET_REJECTED: "bet:rejected",
  ADJUDICATOR_CHANGED: "adjudicator:changed",
  NOTIFICATION_RECEIVED: "notification:received",
  ERROR: "error",
} as const

// Payload for round status change events.
// Optionally includes round data when transitioning from "waiting".
export interface RoundStatusPayload {
  champId: string
  roundIndex: number
  status: RoundStatus
  timestamp: string
  round?: {
    drivers: DriverEntryType[]
    competitors: CompetitorEntryType[]
    teams: TeamEntryType[]
  }
  isSeasonEnd?: boolean // True when the last round of a season transitions to results
  seasonEndedAt?: string // ISO timestamp for the 24h ChampionshipFinishView countdown
}

// Payload for bet placed events (broadcast to all users).
export interface BetPlacedPayload {
  champId: string
  roundIndex: number
  competitorId: string
  driverId: string | null
  previousDriverId: string | null
  timestamp: string
}

// Payload confirming bet was placed successfully (sent to bettor only).
export interface BetConfirmedPayload {
  champId: string
  roundIndex: number
  driverId: string
  competitorId: string
  timestamp: string
}

// Payload when bet is rejected (sent to bettor only).
export interface BetRejectedPayload {
  champId: string
  roundIndex: number
  driverId: string
  reason: "already_taken" | "betting_closed" | "not_competitor" | "invalid_round" | "not_found" | "server_error" | "not_authorized"
  takenBy?: string
}

// Payload when adjudicator is changed (broadcast to championship room).
export interface AdjudicatorChangedPayload {
  champId: string
  newAdjudicatorId: string
  oldAdjudicatorId: string
  oldAdjudicatorPermissionRemoved: boolean
  timestamp: string
}

// Socket instance (singleton).
let socket: Socket | null = null

// Initializes socket connection with JWT authentication.
// Reuses the existing socket instance if one exists, updating auth for reconnection.
// This preserves all attached listeners across token refreshes.
export const initSocket = (accessToken: string): Socket => {
  if (socket) {
    // Update auth token for future reconnection attempts.
    socket.auth = { accessToken }
    // Reconnect if disconnected (e.g. after token expiry).
    if (!socket.connected) {
      socket.connect()
    }
    return socket
  }

  socket = io(getApiUrl(), {
    auth: {
      accessToken,
    },
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  // Close socket cleanly before page unload to prevent WebSocket upgrade race condition.
  window.addEventListener("beforeunload", () => {
    socket?.close()
  })

  return socket
}

// Returns the existing socket instance.
export const getSocket = (): Socket | null => socket

// Disconnects the socket.
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Joins a championship room to receive updates.
export const joinChampionshipRoom = (champId: string): void => {
  if (socket?.connected) {
    socket.emit(SOCKET_EVENTS.JOIN_CHAMPIONSHIP, champId)
  }
}

// Leaves a championship room.
export const leaveChampionshipRoom = (champId: string): void => {
  if (socket?.connected) {
    socket.emit(SOCKET_EVENTS.LEAVE_CHAMPIONSHIP, champId)
  }
}

// Places a bet via socket for low-latency betting.
// Optional competitorId allows adjudicators to place bets on behalf of other users.
export const placeBetViaSocket = (
  champId: string,
  roundIndex: number,
  driverId: string,
  competitorId?: string
): void => {
  if (socket?.connected) {
    socket.emit(SOCKET_EVENTS.PLACE_BET, { champId, roundIndex, driverId, competitorId })
  }
}

// Subscribes to notification events.
// Users are auto-joined to their user room on connection.
export const onNotificationReceived = (
  callback: (notification: NotificationType) => void
): (() => void) => {
  if (socket) {
    socket.on(SOCKET_EVENTS.NOTIFICATION_RECEIVED, callback)
    return () => socket?.off(SOCKET_EVENTS.NOTIFICATION_RECEIVED, callback)
  }
  return () => {}
}
