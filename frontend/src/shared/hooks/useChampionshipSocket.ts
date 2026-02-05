import { useEffect, useContext, useRef } from "react"
import AppContext from "../../context"
import {
  initSocket,
  getSocket,
  joinChampionshipRoom,
  leaveChampionshipRoom,
  SOCKET_EVENTS,
  RoundStatusPayload,
  BetPlacedPayload,
  BetConfirmedPayload,
  BetRejectedPayload,
} from "../socket/socketClient"

// Hook to manage socket connection and championship room subscription.
// Automatically joins the championship room and listens for round status changes and bet updates.
// If isBanned is true, the socket room will not be joined.
export const useChampionshipSocket = (
  champId: string | undefined,
  onRoundStatusChange?: (payload: RoundStatusPayload) => void,
  onBetPlaced?: (payload: BetPlacedPayload) => void,
  onBetConfirmed?: (payload: BetConfirmedPayload) => void,
  onBetRejected?: (payload: BetRejectedPayload) => void,
  isBanned?: boolean,
): void => {
  const { user } = useContext(AppContext)
  const statusCallbackRef = useRef(onRoundStatusChange)
  const betCallbackRef = useRef(onBetPlaced)
  const betConfirmedRef = useRef(onBetConfirmed)
  const betRejectedRef = useRef(onBetRejected)

  // Keep callback refs updated to avoid stale closures.
  useEffect(() => {
    statusCallbackRef.current = onRoundStatusChange
  }, [onRoundStatusChange])

  useEffect(() => {
    betCallbackRef.current = onBetPlaced
  }, [onBetPlaced])

  useEffect(() => {
    betConfirmedRef.current = onBetConfirmed
  }, [onBetConfirmed])

  useEffect(() => {
    betRejectedRef.current = onBetRejected
  }, [onBetRejected])

  // Initialize socket on mount when user has token.
  useEffect(() => {
    if (!user.token) return

    initSocket(user.token)
  }, [user.token])

  // Join/leave championship room when champId changes.
  // Skips joining if user is banned from the championship.
  // Also handles reconnection by always listening for the "connect" event.
  useEffect(() => {
    if (!champId || !user.token) return

    // Don't join socket room if user is banned.
    if (isBanned) return

    const socket = getSocket()
    if (!socket) return

    // Function to join the championship room.
    const joinRoom = (): void => {
      joinChampionshipRoom(champId)
    }

    // Join immediately if already connected.
    if (socket.connected) {
      joinRoom()
    }

    // Always attach connect listener to handle initial connection and reconnections.
    socket.on("connect", joinRoom)

    return () => {
      socket.off("connect", joinRoom)
      leaveChampionshipRoom(champId)
    }
  }, [champId, user.token, isBanned])

  // Listen for round status changes.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: RoundStatusPayload): void => {
      if (payload.champId === champId && statusCallbackRef.current) {
        statusCallbackRef.current(payload)
      }
    }

    socket.on(SOCKET_EVENTS.ROUND_STATUS_CHANGED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_STATUS_CHANGED, handler)
    }
  }, [champId])

  // Listen for bet placed events (from other users).
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: BetPlacedPayload): void => {
      if (payload.champId === champId && betCallbackRef.current) {
        betCallbackRef.current(payload)
      }
    }

    socket.on(SOCKET_EVENTS.BET_PLACED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.BET_PLACED, handler)
    }
  }, [champId])

  // Listen for bet confirmed events (our own bet was accepted).
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: BetConfirmedPayload): void => {
      if (payload.champId === champId && betConfirmedRef.current) {
        betConfirmedRef.current(payload)
      }
    }

    socket.on(SOCKET_EVENTS.BET_CONFIRMED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.BET_CONFIRMED, handler)
    }
  }, [champId])

  // Listen for bet rejected events (our bet was rejected).
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: BetRejectedPayload): void => {
      if (payload.champId === champId && betRejectedRef.current) {
        betRejectedRef.current(payload)
      }
    }

    socket.on(SOCKET_EVENTS.BET_REJECTED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.BET_REJECTED, handler)
    }
  }, [champId])
}
