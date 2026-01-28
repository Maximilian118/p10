import { useEffect, useContext } from "react"
import AppContext from "../../context"
import { initSocket, getSocket, onNotificationReceived } from "../socket/socketClient"
import { NotificationType } from "../types"

// Hook to listen for real-time notification updates via WebSocket.
// Should be used at the app level to receive notifications regardless of current page.
// Updates the user context when a new notification is received.
export const useNotificationSocket = (): void => {
  const { user, setUser } = useContext(AppContext)

  // Initialize socket when user has token.
  useEffect(() => {
    if (!user.token) return

    initSocket(user.token)
  }, [user.token])

  // Listen for notification events and update user context.
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user._id) return

    // Handler to add new notification to user state.
    const handleNotification = (notification: NotificationType): void => {
      setUser((prev) => ({
        ...prev,
        notifications: [notification, ...(prev.notifications || [])],
      }))
    }

    // Subscribe to notification events.
    const unsubscribe = onNotificationReceived(handleNotification)

    return () => {
      unsubscribe()
    }
  }, [user._id, setUser])
}
