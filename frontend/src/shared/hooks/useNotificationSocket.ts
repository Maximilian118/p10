import { useEffect, useContext } from "react"
import AppContext from "../../context"
import { initSocket, getSocket, onNotificationReceived } from "../socket/socketClient"

// Hook to listen for real-time notification updates via WebSocket.
// Should be used at the app level to receive notifications regardless of current page.
// Increments notificationsCount when a new notification is received.
export const useNotificationSocket = (): void => {
  const { user, setUser } = useContext(AppContext)

  // Initialize socket when user has token.
  useEffect(() => {
    if (!user.token) return

    initSocket(user.token)
  }, [user.token])

  // Listen for notification events and increment unread count.
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user._id) return

    // Handler to increment notificationsCount in state and localStorage.
    const handleNotification = (): void => {
      setUser((prev) => {
        const newCount = (prev.notificationsCount || 0) + 1
        localStorage.setItem("notificationsCount", String(newCount))
        return {
          ...prev,
          notificationsCount: newCount,
        }
      })
    }

    // Subscribe to notification events.
    const unsubscribe = onNotificationReceived(handleNotification)

    return () => {
      unsubscribe()
    }
  }, [user._id, setUser])
}
