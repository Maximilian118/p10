import { Server, Socket } from "socket.io"
import jwt, { JwtPayload } from "jsonwebtoken"
import Champ, { RoundStatus } from "../models/champ"
import { placeBetAtomic } from "./betHandler"

// Socket event names - centralized for consistency.
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
// Optionally includes round data when transitioning from "waiting".
export interface RoundStatusPayload {
  champId: string
  roundIndex: number
  status: RoundStatus
  timestamp: string
  round?: {
    drivers: unknown[]
    competitors: unknown[]
    teams: unknown[]
  }
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

// Payload for client requesting to place a bet.
export interface PlaceBetPayload {
  champId: string
  roundIndex: number
  driverId: string
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
    // Emits current round state to the joining socket for immediate sync.
    socket.on(SOCKET_EVENTS.JOIN_CHAMPIONSHIP, async (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`
      socket.join(roomName)
      console.log(`User ${socket.data.userId} joined room ${roomName}`)

      // Fetch current championship state and emit to the joining socket.
      try {
        const champ = await Champ.findById(champId)
        if (champ) {
          const activeRoundIndex = champ.rounds.findIndex(
            (r) => r.status !== "completed" && r.status !== "waiting",
          )
          if (activeRoundIndex !== -1) {
            const round = champ.rounds[activeRoundIndex]
            const payload: RoundStatusPayload = {
              champId,
              roundIndex: activeRoundIndex,
              status: round.status,
              timestamp: round.statusChangedAt || new Date().toISOString(),
            }
            socket.emit(SOCKET_EVENTS.ROUND_STATUS_CHANGED, payload)
            console.log(`Sent initial state to user ${socket.data.userId}: round ${activeRoundIndex} -> ${round.status}`)
          }
        }
      } catch (err) {
        console.error(`Error fetching initial state for ${champId}:`, err)
      }
    })

    // Leave championship room.
    socket.on(SOCKET_EVENTS.LEAVE_CHAMPIONSHIP, (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`
      socket.leave(roomName)
      console.log(`User ${socket.data.userId} left room ${roomName}`)
    })

    // Handle bet placement via socket for low-latency betting.
    socket.on(SOCKET_EVENTS.PLACE_BET, async (payload: PlaceBetPayload) => {
      const { champId, roundIndex, driverId } = payload
      const userId = socket.data.userId

      if (!champId || roundIndex === undefined || !driverId) {
        socket.emit(SOCKET_EVENTS.BET_REJECTED, {
          champId,
          roundIndex,
          driverId,
          reason: "server_error",
        } as BetRejectedPayload)
        return
      }

      try {
        const result = await placeBetAtomic(champId, roundIndex, driverId, userId)

        if (result.success) {
          const timestamp = new Date().toISOString()

          // Confirm to the user who placed the bet.
          socket.emit(SOCKET_EVENTS.BET_CONFIRMED, {
            champId,
            roundIndex,
            driverId,
            timestamp,
          } as BetConfirmedPayload)

          // Broadcast to all other users in the room (not the sender).
          socket.to(`championship:${champId}`).emit(SOCKET_EVENTS.BET_PLACED, {
            champId,
            roundIndex,
            competitorId: userId,
            driverId,
            previousDriverId: result.previousDriverId,
            timestamp,
          } as BetPlacedPayload)

          console.log(`Socket bet placed: ${champId} round ${roundIndex} - user ${userId} bet on ${driverId}`)
        } else {
          socket.emit(SOCKET_EVENTS.BET_REJECTED, {
            champId,
            roundIndex,
            driverId,
            reason: result.reason || "server_error",
            takenBy: result.takenBy,
          } as BetRejectedPayload)

          console.log(`Socket bet rejected: ${champId} round ${roundIndex} - user ${userId} tried ${driverId}, reason: ${result.reason}`)
        }
      } catch (err) {
        console.error(`Error placing bet via socket:`, err)
        socket.emit(SOCKET_EVENTS.BET_REJECTED, {
          champId,
          roundIndex,
          driverId,
          reason: "server_error",
        } as BetRejectedPayload)
      }
    })

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${socket.data.userId})`)
    })
  })
}

// Broadcasts round status change to all users in a championship room.
// Optionally includes round data when transitioning from "waiting".
export const broadcastRoundStatusChange = (
  io: Server,
  champId: string,
  roundIndex: number,
  newStatus: RoundStatus,
  roundData?: { drivers: unknown[]; competitors: unknown[]; teams: unknown[] }
): void => {
  const payload: RoundStatusPayload = {
    champId,
    roundIndex,
    status: newStatus,
    timestamp: new Date().toISOString(),
    ...(roundData && { round: roundData }),
  }
  io.to(`championship:${champId}`).emit(SOCKET_EVENTS.ROUND_STATUS_CHANGED, payload)
  console.log(`Broadcasted status change: ${champId} round ${roundIndex} -> ${newStatus}`)
}

// Broadcasts bet placed event to all users in a championship room.
export const broadcastBetPlaced = (
  io: Server,
  champId: string,
  roundIndex: number,
  competitorId: string,
  driverId: string | null,
  previousDriverId: string | null
): void => {
  const payload: BetPlacedPayload = {
    champId,
    roundIndex,
    competitorId,
    driverId,
    previousDriverId,
    timestamp: new Date().toISOString(),
  }
  io.to(`championship:${champId}`).emit(SOCKET_EVENTS.BET_PLACED, payload)
  console.log(`Broadcasted bet: ${champId} round ${roundIndex} - competitor ${competitorId} bet on ${driverId}`)
}
