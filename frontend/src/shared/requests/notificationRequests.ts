import axios from "axios"
import { userType, tokensHandler, NotificationType } from "../localStorage"
import { populateNotification } from "./requestPopulation"
import { graphQLErrors, graphQLErrorType, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { NotificationSettingsType } from "../types"

// Fetch all notifications for the authenticated user.
// Stores notifications in localStorage and updates notificationsCount in state.
export const getNotifications = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<NotificationType[] | null> => {
  try {
    const res = await axios.post(
      "",
      {
        query: `
          query GetNotifications {
            getNotifications {
              notifications {
                ${populateNotification}
              }
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("getNotifications", res, setUser, navigate, setBackendErr, true)
      return null
    }

    const data = res.data.data.getNotifications
    const notifications: NotificationType[] = data.notifications
    const notificationsCount = notifications.filter((n) => !n.read).length

    // Handle token refresh.
    tokensHandler(user, data.tokens, setUser)

    // Update localStorage with fetched notifications.
    localStorage.setItem("notifications", JSON.stringify(notifications))
    localStorage.setItem("notificationsCount", String(notificationsCount))

    // Update user state.
    setUser((prev) => ({
      ...prev,
      notifications,
      notificationsCount,
    }))

    return notifications
  } catch (err: unknown) {
    graphQLErrors("getNotifications", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Mark a notification as read.
// Optimistically updates local state and localStorage.
export const markNotificationRead = async (
  notificationId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { _id: notificationId },
        query: `
          mutation MarkNotificationRead($_id: ID!) {
            markNotificationRead(_id: $_id) {
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("markNotificationRead", res, setUser, navigate, setBackendErr, true)
      return false
    }

    // Handle token refresh.
    tokensHandler(user, res.data.data.markNotificationRead.tokens, setUser)

    // Optimistically update notifications in state and localStorage.
    setUser((prev) => {
      const updatedNotifications = prev.notifications.map((n) =>
        n._id === notificationId ? { ...n, read: true } : n,
      )
      const updatedCount = updatedNotifications.filter((n) => !n.read).length

      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      localStorage.setItem("notificationsCount", String(updatedCount))

      return {
        ...prev,
        notifications: updatedNotifications,
        notificationsCount: updatedCount,
      }
    })

    return true
  } catch (err: unknown) {
    graphQLErrors("markNotificationRead", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Clear a single notification.
// Removes it from local state and localStorage.
export const clearNotification = async (
  notificationId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { _id: notificationId },
        query: `
          mutation ClearNotification($_id: ID!) {
            clearNotification(_id: $_id) {
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("clearNotification", res, setUser, navigate, setBackendErr, true)
      return false
    }

    // Handle token refresh.
    tokensHandler(user, res.data.data.clearNotification.tokens, setUser)

    // Remove notification from state and localStorage.
    setUser((prev) => {
      const updatedNotifications = prev.notifications.filter((n) => n._id !== notificationId)
      const updatedCount = updatedNotifications.filter((n) => !n.read).length

      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      localStorage.setItem("notificationsCount", String(updatedCount))

      return {
        ...prev,
        notifications: updatedNotifications,
        notificationsCount: updatedCount,
      }
    })

    return true
  } catch (err: unknown) {
    graphQLErrors("clearNotification", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Clear all notifications.
// Empties notifications in state and localStorage.
export const clearAllNotifications = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        query: `
          mutation ClearAllNotifications {
            clearAllNotifications {
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("clearAllNotifications", res, setUser, navigate, setBackendErr, true)
      return false
    }

    // Handle token refresh.
    tokensHandler(user, res.data.data.clearAllNotifications.tokens, setUser)

    // Clear all notifications from state and localStorage.
    localStorage.setItem("notifications", JSON.stringify([]))
    localStorage.setItem("notificationsCount", "0")

    setUser((prev) => ({
      ...prev,
      notifications: [],
      notificationsCount: 0,
    }))

    return true
  } catch (err: unknown) {
    graphQLErrors("clearAllNotifications", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Update notification settings.
// Updates settings in state and localStorage.
export const updateNotificationSettings = async (
  settings: Partial<NotificationSettingsType>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { settings },
        query: `
          mutation UpdateNotificationSettings($settings: NotificationSettingsInput!) {
            updateNotificationSettings(settings: $settings) {
              tokens
              notificationSettings {
                emailChampInvite
                emailBadgeEarned
                emailRoundStarted
                emailResultsPosted
                emailKicked
                emailBanned
                emailPromoted
                emailUserJoined
                emailRoundMissed
                emailProtestFiled
                emailProtestVoteRequired
                emailProtestPassed
                emailProtestDenied
                emailProtestExpired
              }
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("updateNotificationSettings", res, setUser, navigate, setBackendErr, true)
      return false
    }

    const data = res.data.data.updateNotificationSettings

    // Handle token refresh.
    tokensHandler(user, data.tokens, setUser)

    // Update notification settings in state and localStorage.
    const updatedSettings = data.notificationSettings

    localStorage.setItem("notificationSettings", JSON.stringify(updatedSettings))

    setUser((prev) => ({
      ...prev,
      notificationSettings: updatedSettings,
    }))

    return true
  } catch (err: unknown) {
    graphQLErrors("updateNotificationSettings", err, setUser, navigate, setBackendErr, true)
    return false
  }
}
