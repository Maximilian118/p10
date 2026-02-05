import React, { useContext, useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import NotificationsNone from "@mui/icons-material/NotificationsNone"
import Close from "@mui/icons-material/Close"
import Delete from "@mui/icons-material/Delete"
import AppContext from "../../context"
import { userBadgeSnapshotType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getNotifications, clearNotification, clearAllNotifications, markNotificationRead } from "../../shared/requests/notificationRequests"
import NotificationListItem from "./components/NotificationListItem/NotificationListItem"
import BadgeCelebration from "../../components/modal/configs/BadgeCelebration/BadgeCelebration"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import Confirm from "../../components/utility/confirm/Confirm"
import "./_notifications.scss"
import { Button } from "@mui/material"
import { ArrowBack } from "@mui/icons-material"

// Notifications page component.
const Notifications: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [clearing, setClearing] = useState<boolean>(false)
  const [celebrationBadge, setCelebrationBadge] = useState<userBadgeSnapshotType | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false)

  // Track previous notificationsCount to detect WebSocket increments.
  const prevCountRef = useRef(user.notificationsCount || 0)

  // Background fetch notifications on mount (no spinner — cached data renders immediately).
  useEffect(() => {
    getNotifications(user, setUser, navigate, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch when notificationsCount increases (WebSocket notification arrived).
  useEffect(() => {
    const currentCount = user.notificationsCount || 0
    if (currentCount > prevCountRef.current) {
      getNotifications(user, setUser, navigate, setBackendErr)
    }
    prevCountRef.current = currentCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.notificationsCount])

  // Sort notifications by createdAt (most recent first).
  const sortedNotifications = useMemo(() => {
    if (!user.notifications?.length) return []
    return [...user.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [user.notifications])

  // Track notifications that have been marked as read to prevent duplicate API calls.
  const markedAsReadRef = useRef<Set<string>>(new Set())

  // Handle clearing a single notification.
  const handleClearNotification = async (notificationId: string) => {
    await clearNotification(notificationId, user, setUser, navigate, setBackendErr)
  }

  // Handle clearing all notifications.
  const handleClearAll = async () => {
    setClearing(true)
    await clearAllNotifications(user, setUser, navigate, setBackendErr)
    setClearing(false)
    setShowClearAllConfirm(false)
  }

  // Handle badge notification click - open celebration modal and clear notification.
  const handleBadgeClick = async (badge: userBadgeSnapshotType, notificationId: string) => {
    setCelebrationBadge(badge)
    // Clear the notification when viewing the badge celebration.
    await clearNotification(notificationId, user, setUser, navigate, setBackendErr)
  }

  // Handle notification becoming visible - mark as read.
  const handleNotificationVisible = useCallback(async (notificationId: string) => {
    // Skip if already marked as read in this session.
    if (markedAsReadRef.current.has(notificationId)) return

    // Find the notification to check if it's unread.
    const notification = sortedNotifications.find(n => n._id === notificationId)
    if (!notification || notification.read) return

    // Mark as processed to prevent duplicate calls.
    markedAsReadRef.current.add(notificationId)

    // Mark as read in the background.
    await markNotificationRead(notificationId, user, setUser, navigate, setBackendErr)
  }, [sortedNotifications, user, setUser, navigate, setBackendErr])

  // Close celebration modal.
  const closeCelebration = () => {
    setCelebrationBadge(null)
  }

  // Show clear all confirmation modal.
  if (showClearAllConfirm) {
    const hasNotifications = sortedNotifications.length > 0
    return hasNotifications ? (
      <Confirm
        variant="dark"
        icon={<Delete />}
        heading="Clear All Notifications?"
        paragraphs={[
          "This will remove all your notifications.",
          "This action cannot be undone."
        ]}
        cancelText="Cancel"
        confirmText="Clear All"
        onCancel={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAll}
        loading={clearing}
      />
    ) : (
      <Confirm
        variant="dark"
        icon={<NotificationsNone />}
        heading="No Notifications"
        paragraphs={["There are no notifications to clear."]}
        confirmText="Back"
        onConfirm={() => setShowClearAllConfirm(false)}
        singleButton
      />
    )
  }

  return (
    <div className="notifications-page">
      <ErrorDisplay backendErr={backendErr} />
      <header className="notifications-header">
        <Button
          className="notifications-header__back-button"
          size="small"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack/>}
        >
          Back
        </Button>
        <h1 className="notifications-header__title">Notifications</h1>
        <Button
          className="notifications-header__clear-all"
          size="small"
          onClick={() => setShowClearAllConfirm(true)}
          endIcon={<Close/>}
        >
          Clear
        </Button>
      </header>
      <span className="notifications-header__line" />
      {sortedNotifications.length === 0 ? (
        <div className="notifications-empty">
          <NotificationsNone />
          <p>No notifications</p>
        </div>
      ) : (
        <ul className="notifications-list">
          {sortedNotifications.map((notification) => (
            <li key={notification._id}>
              <NotificationListItem
                notification={notification}
                onClear={handleClearNotification}
                onBadgeClick={(badge) => handleBadgeClick(badge, notification._id)}
                onVisible={handleNotificationVisible}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Badge Celebration Modal */}
      {celebrationBadge && (
        <BadgeCelebration badge={celebrationBadge} onClose={closeCelebration} />
      )}
    </div>
  )
}

export default Notifications
