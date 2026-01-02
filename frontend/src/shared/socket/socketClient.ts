import { io, Socket } from "socket.io-client"
import { RoundStatus } from "../types"

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
  ERROR: "error",
} as const

// Payload for round status change events.
export interface RoundStatusPayload {
  champId: string
  roundIndex: number
  status: RoundStatus
  timestamp: string
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
  timestamp: string
}

// Payload when bet is rejected (sent to bettor only).
export interface BetRejectedPayload {
  champId: string
  roundIndex: number
  driverId: string
  reason: "already_taken" | "betting_closed" | "not_competitor" | "invalid_round" | "not_found" | "server_error"
  takenBy?: string
}

// Socket instance (singleton).
let socket: Socket | null = null

// Initializes socket connection with JWT authentication.
export const initSocket = (accessToken: string): Socket => {
  if (socket?.connected) {
    return socket
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"

  socket = io(apiUrl, {
    auth: {
      accessToken,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
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
export const placeBetViaSocket = (champId: string, roundIndex: number, driverId: string): void => {
  if (socket?.connected) {
    socket.emit(SOCKET_EVENTS.PLACE_BET, { champId, roundIndex, driverId })
  }
}
