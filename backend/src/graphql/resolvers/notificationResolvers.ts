import User, { userType, userTypeMongo } from "../../models/user"
import { NotificationSettingsType } from "../../models/notification"
import { throwError } from "./resolverErrors"
import { AuthRequest } from "../../middleware/auth"
import { signTokens } from "../../shared/utility"

// Compute unread notifications count from a user's notifications array.
const getUnreadCount = (user: userTypeMongo): number => {
  return (user.notifications || []).filter(
    (n: { read: boolean }) => !n.read,
  ).length
}

const notificationResolvers = {
  // Fetch all notifications for the authenticated user.
  getNotifications: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<{ notifications: unknown[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getNotifications", req.isAuth, "Not Authenticated!", 401)
    }

    const user = (await User.findById(req._id).select("notifications refresh_count")) as userTypeMongo

    if (!user) {
      throwError("getNotifications", null, "User not found!", 404)
    }

    return {
      notifications: user.notifications || [],
      tokens: signTokens(user),
    }
  },

  // Mark a single notification as read.
  // Uses atomic findOneAndUpdate to avoid version conflicts.
  markNotificationRead: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("markNotificationRead", req.isAuth, "Not Authenticated!", 401)
    }

    // Atomic update - avoids version conflicts from concurrent modifications.
    const user = await User.findOneAndUpdate(
      { _id: req._id, "notifications._id": _id },
      { $set: { "notifications.$.read": true } },
      { new: true }
    ) as userTypeMongo

    if (!user) {
      throwError("markNotificationRead", null, "User or notification not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Clear (delete) a single notification.
  // Uses atomic findOneAndUpdate to avoid version conflicts.
  clearNotification: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("clearNotification", req.isAuth, "Not Authenticated!", 401)
    }

    // Atomic update - pull the notification from the array.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $pull: { notifications: { _id: _id } } },
      { new: true }
    ) as userTypeMongo

    if (!user) {
      throwError("clearNotification", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Clear all notifications.
  // Uses atomic findOneAndUpdate to avoid version conflicts.
  clearAllNotifications: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("clearAllNotifications", req.isAuth, "Not Authenticated!", 401)
    }

    // Atomic update - set notifications to empty array.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $set: { notifications: [] } },
      { new: true }
    ) as userTypeMongo

    if (!user) {
      throwError("clearAllNotifications", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: 0,
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Update notification email settings.
  // Uses atomic findOneAndUpdate to avoid version conflicts.
  updateNotificationSettings: async (
    { settings }: { settings: Partial<NotificationSettingsType> },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updateNotificationSettings", req.isAuth, "Not Authenticated!", 401)
    }

    // Build atomic $set operations for only the provided settings.
    const setOperations: Record<string, boolean> = {}
    if (settings.emailChampInvite !== undefined) {
      setOperations["notificationSettings.emailChampInvite"] = settings.emailChampInvite
    }
    if (settings.emailBadgeEarned !== undefined) {
      setOperations["notificationSettings.emailBadgeEarned"] = settings.emailBadgeEarned
    }
    if (settings.emailRoundStarted !== undefined) {
      setOperations["notificationSettings.emailRoundStarted"] = settings.emailRoundStarted
    }
    if (settings.emailResultsPosted !== undefined) {
      setOperations["notificationSettings.emailResultsPosted"] = settings.emailResultsPosted
    }
    if (settings.emailKicked !== undefined) {
      setOperations["notificationSettings.emailKicked"] = settings.emailKicked
    }
    if (settings.emailBanned !== undefined) {
      setOperations["notificationSettings.emailBanned"] = settings.emailBanned
    }
    if (settings.emailPromoted !== undefined) {
      setOperations["notificationSettings.emailPromoted"] = settings.emailPromoted
    }
    if (settings.emailUserJoined !== undefined) {
      setOperations["notificationSettings.emailUserJoined"] = settings.emailUserJoined
    }
    if (settings.emailProtestFiled !== undefined) {
      setOperations["notificationSettings.emailProtestFiled"] = settings.emailProtestFiled
    }
    if (settings.emailProtestVoteRequired !== undefined) {
      setOperations["notificationSettings.emailProtestVoteRequired"] = settings.emailProtestVoteRequired
    }
    if (settings.emailProtestPassed !== undefined) {
      setOperations["notificationSettings.emailProtestPassed"] = settings.emailProtestPassed
    }
    if (settings.emailProtestDenied !== undefined) {
      setOperations["notificationSettings.emailProtestDenied"] = settings.emailProtestDenied
    }
    if (settings.emailProtestExpired !== undefined) {
      setOperations["notificationSettings.emailProtestExpired"] = settings.emailProtestExpired
    }

    // If no settings provided, just return current user.
    if (Object.keys(setOperations).length === 0) {
      const user = await User.findById(req._id) as userTypeMongo
      if (!user) {
        throwError("updateNotificationSettings", null, "User not found!", 404)
      }
      return {
        ...user._doc,
        notificationsCount: getUnreadCount(user),
        tokens: signTokens(user),
        password: null,
        email: user.email,
      }
    }

    // Atomic update - set only the provided notification settings.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $set: setOperations },
      { new: true }
    ) as userTypeMongo

    if (!user) {
      throwError("updateNotificationSettings", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },
}

export default notificationResolvers
