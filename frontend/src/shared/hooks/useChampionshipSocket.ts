import { useEffect, useContext, useRef } from "react"
import AppContext from "../../context"
import {
  initSocket,
  getSocket,
  joinChampionshipRoom,
  leaveChampionshipRoom,
  SOCKET_EVENTS,
  RoundStatusPayload,
} from "../socket/socketClient"

// Hook to manage socket connection and championship room subscription.
// Automatically joins the championship room and listens for round status changes.
export const useChampionshipSocket = (
  champId: string | undefined,
  onRoundStatusChange?: (payload: RoundStatusPayload) => void,
): void => {
  const { user } = useContext(AppContext)
  const callbackRef = useRef(onRoundStatusChange)

  // Keep callback ref updated to avoid stale closures.
  useEffect(() => {
    callbackRef.current = onRoundStatusChange
  }, [onRoundStatusChange])

  // Initialize socket on mount when user has token.
  useEffect(() => {
    if (!user.token) return

    initSocket(user.token)
  }, [user.token])

  // Join/leave championship room when champId changes.
  useEffect(() => {
    if (!champId || !user.token) return

    const socket = getSocket()
    if (!socket) return

    // Wait for socket to connect before joining room.
    const joinRoom = (): void => {
      joinChampionshipRoom(champId)
    }

    if (socket.connected) {
      joinRoom()
    } else {
      socket.on("connect", joinRoom)
    }

    return () => {
      socket.off("connect", joinRoom)
      leaveChampionshipRoom(champId)
    }
  }, [champId, user.token])

  // Listen for round status changes.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: RoundStatusPayload): void => {
      if (payload.champId === champId && callbackRef.current) {
        callbackRef.current(payload)
      }
    }

    socket.on(SOCKET_EVENTS.ROUND_STATUS_CHANGED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_STATUS_CHANGED, handler)
    }
  }, [champId])
}
