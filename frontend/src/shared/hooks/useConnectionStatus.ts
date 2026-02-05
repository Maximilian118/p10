import { useState, useEffect, useRef } from "react"
import { getSocket } from "../socket/socketClient"

// Delay before showing socket disconnection warning (avoids flashing on brief interruptions).
const DISCONNECT_DEBOUNCE_MS = 5000

// Monitors browser connectivity and socket connection status.
// Returns a short status string when there's a problem, or null when everything is fine.
const useConnectionStatus = (): string | null => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showDisconnected, setShowDisconnected] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track browser online/offline state.
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Track socket.io connection state with debounce.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleConnect = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      setShowDisconnected(false)
    }

    const handleDisconnect = () => {
      // Debounce: only show warning after a sustained disconnection.
      timerRef.current = setTimeout(() => setShowDisconnected(true), DISCONNECT_DEBOUNCE_MS)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    // Check initial state in case the socket is already disconnected.
    if (!socket.connected) {
      timerRef.current = setTimeout(() => setShowDisconnected(true), DISCONNECT_DEBOUNCE_MS)
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!isOnline) return "Offline"
  if (showDisconnected) return "Disconnected"
  return null
}

export default useConnectionStatus
