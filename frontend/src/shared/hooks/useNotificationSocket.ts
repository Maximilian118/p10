import { useEffect, useLayoutEffect, useContext } from "react"
import AppContext from "../../context"
import { initSocket, onNotificationReceived } from "../socket/socketClient"

// Hook to listen for real-time notification updates via WebSocket.
// Should be used at the app level to receive notifications regardless of current page.
// Increments notificationsCount when a new notification is received.
export const useNotificationSocket = (): void => {
  const { user, setUser } = useContext(AppContext)

  // Initialize socket before regular effects so child hooks (useLiveSession,
  // useConnectionStatus) can access it in their useEffect callbacks.
  // useLayoutEffect runs before all useEffect hooks regardless of component depth.
  useLayoutEffect(() => {
    if (!user.token || !user._id) return
    initSocket(user.token)
  }, [user.token, user._id])

  // Listen for notification events.
  // Re-runs on token change to reattach listener.
  useEffect(() => {
    if (!user.token || !user._id) return

    // Increment notificationsCount in state and localStorage.
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
  }, [user.token, user._id, setUser])
}
