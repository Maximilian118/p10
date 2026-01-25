import { Server, Socket } from "socket.io"
import jwt, { JwtPayload } from "jsonwebtoken"
import Champ, { RoundStatus } from "../models/champ"
import User from "../models/user"
import { placeBetAtomic } from "./betHandler"

// Verbose socket logging is opt-in via env variable.
const verboseLogs = process.env.VERBOSE_SOCKET_LOGS === "true"

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
  ADJUDICATOR_CHANGED: "adjudicator:changed",
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
// Optional competitorId allows adjudicators to place bets on behalf of other users.
export interface PlaceBetPayload {
  champId: string
  roundIndex: number
  driverId: string
  competitorId?: string
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

  io.on("connection", async (socket: Socket) => {
    // Fetch user name for readable logging (development only).
    if (verboseLogs) {
      try {
        const user = await User.findById(socket.data.userId).select("name")
        socket.data.userName = user?.name || socket.data.userId
      } catch {
        socket.data.userName = socket.data.userId
      }
      console.log(`Socket connected: ${socket.id} (user: ${socket.data.userName})`)
    }

    // Join championship room to receive updates for that championship.
    // Emits current round state to the joining socket for immediate sync.
    socket.on(SOCKET_EVENTS.JOIN_CHAMPIONSHIP, async (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`

      // Fetch current championship state and check if user is banned.
      try {
        const champ = await Champ.findById(champId)
        if (!champ) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "Championship not found" })
          return
        }

        // Check if user is banned from this championship.
        const isBanned = champ.banned?.some((b) => b.toString() === socket.data.userId)
        if (isBanned) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "You are banned from this championship" })
          if (verboseLogs) console.log(`${socket.data.userName} tried to join room: ${champ.name} but is banned`)
          return
        }

        // Join the room.
        socket.join(roomName)
        if (verboseLogs) console.log(`${socket.data.userName} joined room: ${champ.name}`)

        // Emit current round state to the joining socket.
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
            if (verboseLogs) console.log(`Sent initial state to ${socket.data.userName}: round ${activeRoundIndex + 1} status "${round.status}"`)
          }
      } catch (err) {
        console.error(`Error fetching initial state for ${champId}:`, err)
      }
    })

    // Leave championship room.
    socket.on(SOCKET_EVENTS.LEAVE_CHAMPIONSHIP, async (champId: string) => {
      if (!champId) return
      const roomName = `championship:${champId}`
      socket.leave(roomName)
      // Fetch champ name for readable logging (development only).
      if (verboseLogs) {
        try {
          const champ = await Champ.findById(champId).select("name")
          console.log(`${socket.data.userName} left room: ${champ?.name || champId}`)
        } catch {
          console.log(`${socket.data.userName} left room: ${champId}`)
        }
      }
    })

    // Handle bet placement via socket for low-latency betting.
    // Supports optional competitorId for adjudicators placing bets on behalf of others.
    socket.on(SOCKET_EVENTS.PLACE_BET, async (payload: PlaceBetPayload) => {
      const { champId, roundIndex, driverId, competitorId } = payload
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

      // Determine target user for bet placement.
      // If competitorId is provided, verify caller is adjudicator before allowing.
      let targetUserId = userId
      if (competitorId) {
        try {
          const champ = await Champ.findById(champId).select("adjudicator")
          if (!champ || champ.adjudicator?.current?.toString() !== userId) {
            socket.emit(SOCKET_EVENTS.BET_REJECTED, {
              champId,
              roundIndex,
              driverId,
              reason: "not_authorized",
            } as BetRejectedPayload)
            if (verboseLogs) console.log(`Socket bet rejected: ${socket.data.userName} not authorized to place bets for others`)
            return
          }
          targetUserId = competitorId
        } catch (err) {
          console.error(`Error verifying adjudicator:`, err)
          socket.emit(SOCKET_EVENTS.BET_REJECTED, {
            champId,
            roundIndex,
            driverId,
            reason: "server_error",
          } as BetRejectedPayload)
          return
        }
      }

      try {
        const result = await placeBetAtomic(champId, roundIndex, driverId, targetUserId)

        if (result.success) {
          const timestamp = new Date().toISOString()

          // Confirm to the user who placed the bet.
          socket.emit(SOCKET_EVENTS.BET_CONFIRMED, {
            champId,
            roundIndex,
            driverId,
            competitorId: targetUserId,
            timestamp,
          } as BetConfirmedPayload)

          // Broadcast to all other users in the room (not the sender).
          socket.to(`championship:${champId}`).emit(SOCKET_EVENTS.BET_PLACED, {
            champId,
            roundIndex,
            competitorId: targetUserId,
            driverId,
            previousDriverId: result.previousDriverId,
            timestamp,
          } as BetPlacedPayload)

          if (verboseLogs) console.log(`Bet placed: round ${roundIndex + 1} - user ${targetUserId} bet on driver ${driverId}${competitorId ? ` (by adjudicator ${socket.data.userName})` : ""}`)
        } else {
          socket.emit(SOCKET_EVENTS.BET_REJECTED, {
            champId,
            roundIndex,
            driverId,
            reason: result.reason || "server_error",
            takenBy: result.takenBy,
          } as BetRejectedPayload)

          if (verboseLogs) console.log(`Bet rejected: round ${roundIndex + 1} - user ${targetUserId} tried driver ${driverId}, reason: ${result.reason}`)
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
      if (verboseLogs) console.log(`Socket disconnected: ${socket.id} (user: ${socket.data.userName})`)
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
  if (verboseLogs) console.log(`Broadcasted status change: round ${roundIndex + 1} -> "${newStatus}"`)
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
  if (verboseLogs) console.log(`Broadcasted bet: round ${roundIndex + 1} - competitor ${competitorId} bet on driver ${driverId}`)
}
