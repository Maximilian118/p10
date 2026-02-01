import React, { useContext, useState, useMemo, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import NotificationsNone from "@mui/icons-material/NotificationsNone"
import Close from "@mui/icons-material/Close"
import Delete from "@mui/icons-material/Delete"
import AppContext from "../../context"
import { userBadgeSnapshotType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { clearNotification, clearAllNotifications, markNotificationRead } from "../../shared/requests/notificationRequests"
import NotificationListItem from "./NotificationListItem/NotificationListItem"
import Badge from "../../components/utility/badge/Badge"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import Confirm from "../../components/utility/confirm/Confirm"
import "./_notifications.scss"

// Confetti colors for celebration.
const confettiColors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]

// Generate random confetti pieces.
const generateConfetti = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))
}

// Notifications page component.
const Notifications: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [clearing, setClearing] = useState<boolean>(false)
  const [celebrationBadge, setCelebrationBadge] = useState<userBadgeSnapshotType | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false)

  // Sort notifications by createdAt (most recent first).
  const sortedNotifications = useMemo(() => {
    if (!user.notifications?.length) return []
    return [...user.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [user.notifications])

  // Generate confetti pieces for celebration modal (regenerates when badge changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const confettiPieces = useMemo(() => generateConfetti(50), [celebrationBadge])

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
    return (
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
    )
  }

  return (
    <div className="notifications-page">
      <ErrorDisplay backendErr={backendErr} />
      <header className="notifications-header">
        <div className="header-title-wrapper">
          <h1 className="notifications-header__title">Notifications</h1>
        </div>
        {sortedNotifications.length > 0 && (
          <button
            className="notifications-header__clear-all"
            onClick={() => setShowClearAllConfirm(true)}
            aria-label="Clear all notifications"
          >
            <Close />
          </button>
        )}
      </header>

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
        <div className="badge-celebration" onClick={closeCelebration}>
          {/* Confetti animation */}
          <div className="badge-celebration__confetti">
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                className="confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  backgroundColor: piece.color,
                  width: `${piece.size}px`,
                  height: `${piece.size}px`,
                  borderRadius: Math.random() > 0.5 ? "50%" : "0",
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>

          {/* Badge */}
          <div className="badge-celebration__badge">
            <Badge badge={celebrationBadge} zoom={100} />
          </div>

          {/* Badge name */}
          <h2 className="badge-celebration__name">
            {celebrationBadge.customName || celebrationBadge.name}
          </h2>

          {/* Badge description */}
          <p className="badge-celebration__description">
            {celebrationBadge.awardedDesc}
          </p>

          {/* Close hint */}
          <p className="badge-celebration__close-hint">
            Click anywhere to close
          </p>
        </div>
      )}
    </div>
  )
}

export default Notifications
