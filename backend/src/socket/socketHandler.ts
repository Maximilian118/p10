import { Server, Socket } from "socket.io"
import jwt, { JwtPayload } from "jsonwebtoken"
import { RoundStatus } from "../models/champ"

// Socket event names - centralized for consistency.
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_CHAMPIONSHIP: "championship:join",
  LEAVE_CHAMPIONSHIP: "championship:leave",
  // Server -> Client
  ROUND_STATUS_CHANGED: "round:status_changed",
  ERROR: "error",
} as const

// Payload for round status change events.
export interface RoundStatusPayload {
  champId: string
  roundIndex: number
  status: RoundStatus
  timestamp: string
}

// Initializes socket authentication middleware and room management.
export const initializeSocket = (io: Server): void => {
  // JWT authentication middleware for socket connections.
  io.use((socket, next) => {
    const token = socket.handshake.auth.accessToken
    if (!token) {
      return next(new Error("Authentication required"))
    }

    try {
      const decoded = jwt.verify(token, `${process.env.ACCESS_TOKEN_SECRET}`) as JwtPayload
      if (decoded && decoded._id) {
        socket.data.userId = decoded._id
        next()
      } else {
        next(new Error("Invalid token"))
      }
    } catch {
      next(new Error("Token expired or invalid"))
    }
  })

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.data.userId})`)

    // Join championship room to receive updates for that championship.
    socket.on(SOCKET_EVENTS.JOIN_CHAMPIONSHIP, (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`
      socket.join(roomName)
      console.log(`User ${socket.data.userId} joined room ${roomName}`)
    })

    // Leave championship room.
    socket.on(SOCKET_EVENTS.LEAVE_CHAMPIONSHIP, (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`
      socket.leave(roomName)
      console.log(`User ${socket.data.userId} left room ${roomName}`)
    })

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${socket.data.userId})`)
    })
  })
}

// Broadcasts round status change to all users in a championship room.
export const broadcastRoundStatusChange = (
  io: Server,
  champId: string,
  roundIndex: number,
  newStatus: RoundStatus
): void => {
  const payload: RoundStatusPayload = {
    champId,
    roundIndex,
    status: newStatus,
    timestamp: new Date().toISOString(),
  }
  io.to(`championship:${champId}`).emit(SOCKET_EVENTS.ROUND_STATUS_CHANGED, payload)
  console.log(`Broadcasted status change: ${champId} round ${roundIndex} -> ${newStatus}`)
}
