import axios from "axios"
import { userType, logInSuccess } from "../localStorage"
import { populateUser } from "./requestPopulation"
import { graphQLErrors, graphQLErrorType, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { NotificationSettingsType } from "../types"

// Mark a notification as read.
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
              ${populateUser}
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

    logInSuccess("markNotificationRead", res, setUser)
    return true
  } catch (err: unknown) {
    graphQLErrors("markNotificationRead", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Clear a single notification.
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
              ${populateUser}
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

    logInSuccess("clearNotification", res, setUser)
    return true
  } catch (err: unknown) {
    graphQLErrors("clearNotification", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Clear all notifications.
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
              ${populateUser}
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

    logInSuccess("clearAllNotifications", res, setUser)
    return true
  } catch (err: unknown) {
    graphQLErrors("clearAllNotifications", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Update notification settings.
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
              ${populateUser}
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

    logInSuccess("updateNotificationSettings", res, setUser)
    return true
  } catch (err: unknown) {
    graphQLErrors("updateNotificationSettings", err, setUser, navigate, setBackendErr, true)
    return false
  }
}
