import moment from "moment"
import { ObjectId } from "mongodb"
import { Resend } from "resend"
import User, { userBadgeSnapshotType } from "../models/user"
import {
  NotificationType,
  NotificationTypeEnum,
  NOTIFICATION_TYPES,
  notificationTypeToSettingsKey,
  defaultNotificationSettings,
} from "../models/notification"
import { io } from "../app"
import { SOCKET_EVENTS } from "../socket/socketHandler"
import { createLogger } from "./logger"

const log = createLogger("Notifications")

// Maximum notifications per user (oldest are dropped when exceeded).
const MAX_NOTIFICATIONS = 100

// Duplicate prevention window in minutes.
const DUPLICATE_WINDOW_MINUTES = 5

// Initialize Resend email client (optional - app works without it).
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

// Helper to send emails safely (logs warning if Resend not configured).
// Returns true if email was sent successfully, false otherwise.
const sendEmail = async (options: { to: string; subject: string; text: string }): Promise<boolean> => {
  if (!resend) {
    log.warn(`📧 Email not sent (Resend not configured): ${options.subject} → ${options.to}`)
    return false
  }
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@p10-game.com",
      ...options,
    })
    log.info(`📧 Email sent: ${options.subject} → ${options.to}`)
    return true
  } catch (err) {
    log.error("📧 Failed to send email:", err)
    return false
  }
}

// Options for sendNotification function.
export interface SendNotificationOptions {
  userId: ObjectId | string
  type: NotificationTypeEnum
  title: string
  description: string
  // Optional championship reference for deep linking.
  champId?: ObjectId | string
  champName?: string
  champIcon?: string
  // Optional badge snapshot for badge earned notifications.
  badgeSnapshot?: userBadgeSnapshotType
  // Optional protest data for protest notifications.
  protestId?: ObjectId | string
  protestTitle?: string
  filerId?: ObjectId | string
  filerName?: string
  filerIcon?: string
  accusedId?: ObjectId | string
  accusedName?: string
  accusedIcon?: string
  filerPoints?: number
  accusedPoints?: number
  protestStatus?: "adjudicating" | "voting" | "denied" | "passed"
  // Optional league reference for deep linking.
  leagueId?: ObjectId | string
  leagueName?: string
  leagueIcon?: string
}

/**
 * Send a notification to a user.
 *
 * This function:
 * 1. Validates the notification type
 * 2. Checks for duplicate notifications (same type + champId within 5 minutes)
 * 3. Atomically adds notification to user's array (avoids version conflicts)
 * 4. Limits array to 100 notifications (oldest dropped)
 * 5. Sends email if user has enabled it for this notification type
 *
 * Usage:
 * ```typescript
 * await sendNotification({
 *   userId: user._id,
 *   type: "champ_invite",
 *   title: "You've been invited!",
 *   description: `Join ${champ.champName} championship`,
 *   champId: champ._id,
 *   champName: champ.champName,
 *   champIcon: champ.icon,
 * })
 * ```
 */
export async function sendNotification(options: SendNotificationOptions): Promise<void> {
  try {
    const {
      userId,
      type,
      title,
      description,
      champId,
      champName,
      champIcon,
      badgeSnapshot,
      protestId,
      protestTitle,
      filerId,
      filerName,
      filerIcon,
      accusedId,
      accusedName,
      accusedIcon,
      filerPoints,
      accusedPoints,
      protestStatus,
      leagueId,
      leagueName,
      leagueIcon,
    } = options

    // Validate notification type.
    if (!NOTIFICATION_TYPES.includes(type)) {
      log.error(`sendNotification: Invalid notification type: ${type}`)
      return
    }

    // Build the notification object.
    const notification: NotificationType = {
      _id: new ObjectId(),
      type,
      title,
      description,
      read: false,
      createdAt: moment().format(),
    }

    // Add optional championship reference.
    if (champId) {
      notification.champId = typeof champId === "string" ? new ObjectId(champId) : champId
    }
    if (champName) {
      notification.champName = champName
    }
    if (champIcon) {
      notification.champIcon = champIcon
    }

    // Add optional league reference.
    if (leagueId) {
      notification.leagueId = typeof leagueId === "string" ? new ObjectId(leagueId) : leagueId
    }
    if (leagueName) {
      notification.leagueName = leagueName
    }
    if (leagueIcon) {
      notification.leagueIcon = leagueIcon
    }

    // Add optional badge snapshot.
    if (badgeSnapshot) {
      notification.badgeSnapshot = badgeSnapshot
    }

    // Add optional protest data.
    if (protestId) {
      notification.protestId = typeof protestId === "string" ? new ObjectId(protestId) : protestId
    }
    if (protestTitle) {
      notification.protestTitle = protestTitle
    }
    if (filerId) {
      notification.filerId = typeof filerId === "string" ? new ObjectId(filerId) : filerId
    }
    if (filerName) {
      notification.filerName = filerName
    }
    if (filerIcon) {
      notification.filerIcon = filerIcon
    }
    if (accusedId) {
      notification.accusedId = typeof accusedId === "string" ? new ObjectId(accusedId) : accusedId
    }
    if (accusedName) {
      notification.accusedName = accusedName
    }
    if (accusedIcon) {
      notification.accusedIcon = accusedIcon
    }
    if (filerPoints !== undefined) {
      notification.filerPoints = filerPoints
    }
    if (accusedPoints !== undefined) {
      notification.accusedPoints = accusedPoints
    }
    if (protestStatus) {
      notification.protestStatus = protestStatus
    }

    // Build duplicate check filter - prevent same notification within DUPLICATE_WINDOW_MINUTES.
    const duplicateCheckTime = moment().subtract(DUPLICATE_WINDOW_MINUTES, "minutes").format()
    const duplicateFilter: Record<string, unknown> = {
      _id: typeof userId === "string" ? new ObjectId(userId) : userId,
      notifications: {
        $elemMatch: {
          type,
          createdAt: { $gte: duplicateCheckTime },
          ...(champId ? { champId: typeof champId === "string" ? new ObjectId(champId) : champId } : {}),
        },
      },
    }

    // Check for duplicate notification.
    const existingUser = await User.findOne(duplicateFilter)
    if (existingUser) {
      log.info(`🔔 Skipping duplicate notification: ${type} for user ${userId}`)
      return
    }

    // Atomic update - push notification to front, limit to MAX_NOTIFICATIONS.
    // Uses $push with $each, $position (front), and $slice (limit) for atomicity.
    const userObjectId = typeof userId === "string" ? new ObjectId(userId) : userId

    // Ensure notifications array exists (required for $push with $slice/$position).
    await User.updateOne(
      { _id: userObjectId, notifications: { $exists: false } },
      { $set: { notifications: [] } }
    )

    const updatedUser = await User.findOneAndUpdate(
      { _id: userObjectId },
      {
        $push: {
          notifications: {
            $each: [notification],
            $position: 0,
            $slice: MAX_NOTIFICATIONS,
          },
        },
      },
      { new: true }
    )

    if (!updatedUser) {
      log.error(`sendNotification: User not found: ${userId}`)
      return
    }

    log.info(`🔔 Notification sent to ${updatedUser.name}: ${title}`)

    // Push notification via WebSocket for real-time delivery.
    // JSON round-trip converts ObjectIds to strings for clean frontend delivery.
    if (io) {
      const serialized = JSON.parse(JSON.stringify(notification))
      io.to(`user:${userObjectId.toString()}`).emit(SOCKET_EVENTS.NOTIFICATION_RECEIVED, serialized)
    }

    // Check if user wants email for this notification type.
    const settings = updatedUser.notificationSettings || defaultNotificationSettings
    const settingsKey = notificationTypeToSettingsKey[type]
    const shouldSendEmail = settings[settingsKey]

    if (shouldSendEmail && updatedUser.email) {
      await sendEmail({
        to: updatedUser.email,
        subject: `P10: ${title}`,
        text: `${description}\n\nVisit P10 to view this notification.`,
      })
    }
  } catch (err) {
    log.error("sendNotification error:", err)
  }
}

/**
 * Send notifications to multiple users at once using bulkWrite.
 * Much more efficient than individual sendNotification calls (1 DB op vs N).
 *
 * NOTE: This function skips duplicate checking for performance.
 * Use for system-triggered events (round_started, results_posted) where
 * duplicates are unlikely. For user-triggered events, use sendNotification.
 *
 * Emails are sent in parallel after the bulk DB update.
 */
export async function sendNotificationToMany(
  userIds: (ObjectId | string)[],
  options: Omit<SendNotificationOptions, "userId">
): Promise<void> {
  const {
    type,
    title,
    description,
    champId,
    champName,
    champIcon,
    badgeSnapshot,
    protestId,
    protestTitle,
    filerId,
    filerName,
    filerIcon,
    accusedId,
    accusedName,
    accusedIcon,
    filerPoints,
    accusedPoints,
    protestStatus,
    leagueId,
    leagueName,
    leagueIcon,
  } = options

  // Validate notification type.
  if (!NOTIFICATION_TYPES.includes(type)) {
    log.error(`sendNotificationToMany: Invalid notification type: ${type}`)
    return
  }

  if (userIds.length === 0) return

  // Ensure all target users have the notifications array initialized.
  // Required because $push with $slice/$position fails on missing arrays.
  const userObjectIds = userIds.map((id) => (typeof id === "string" ? new ObjectId(id) : id))
  await User.updateMany(
    { _id: { $in: userObjectIds }, notifications: { $exists: false } },
    { $set: { notifications: [] } }
  )

  const createdAt = moment().format()

  // Build notification objects per user (each with unique _id).
  // Used for both the DB bulk write and per-user WebSocket push.
  const userNotifications = userIds.map((userId) => {
    const notification: NotificationType = {
      _id: new ObjectId(),
      type,
      title,
      description,
      read: false,
      createdAt,
    }

    if (champId) notification.champId = typeof champId === "string" ? new ObjectId(champId) : champId
    if (champName) notification.champName = champName
    if (champIcon) notification.champIcon = champIcon
    if (badgeSnapshot) notification.badgeSnapshot = badgeSnapshot

    // Add league data if present.
    if (leagueId) notification.leagueId = typeof leagueId === "string" ? new ObjectId(leagueId) : leagueId
    if (leagueName) notification.leagueName = leagueName
    if (leagueIcon) notification.leagueIcon = leagueIcon

    // Add protest data if present.
    if (protestId) notification.protestId = typeof protestId === "string" ? new ObjectId(protestId) : protestId
    if (protestTitle) notification.protestTitle = protestTitle
    if (filerId) notification.filerId = typeof filerId === "string" ? new ObjectId(filerId) : filerId
    if (filerName) notification.filerName = filerName
    if (filerIcon) notification.filerIcon = filerIcon
    if (accusedId) notification.accusedId = typeof accusedId === "string" ? new ObjectId(accusedId) : accusedId
    if (accusedName) notification.accusedName = accusedName
    if (accusedIcon) notification.accusedIcon = accusedIcon
    if (filerPoints !== undefined) notification.filerPoints = filerPoints
    if (accusedPoints !== undefined) notification.accusedPoints = accusedPoints
    if (protestStatus) notification.protestStatus = protestStatus

    return {
      userObjectId: typeof userId === "string" ? new ObjectId(userId) : userId,
      notification,
    }
  })

  // Build bulk ops from the notification objects.
  const bulkOps = userNotifications.map(({ userObjectId, notification }) => ({
    updateOne: {
      filter: { _id: userObjectId },
      update: {
        $push: {
          notifications: {
            $each: [notification],
            $position: 0,
            $slice: MAX_NOTIFICATIONS,
          },
        },
      },
    },
  }))

  // Single bulk write operation for all users.
  const result = await User.bulkWrite(bulkOps)
  log.info(`🔔 Bulk notification sent to ${result.modifiedCount} users: ${title}`)

  // Push each user's full notification via WebSocket (includes _id and all fields).
  // JSON round-trip converts ObjectIds to strings for clean frontend delivery.
  if (io) {
    userNotifications.forEach(({ userObjectId, notification }) => {
      const serialized = JSON.parse(JSON.stringify(notification))
      io.to(`user:${userObjectId.toString()}`).emit(SOCKET_EVENTS.NOTIFICATION_RECEIVED, serialized)
    })
  }

  // Fetch users who want emails for this notification type.
  const settingsKey = notificationTypeToSettingsKey[type]
  const usersForEmail = await User.find({
    _id: { $in: userIds.map((id) => (typeof id === "string" ? new ObjectId(id) : id)) },
    email: { $exists: true, $ne: null },
    [`notificationSettings.${settingsKey}`]: true,
  }).select("email")

  // Send emails in parallel (fire and forget - don't block on email).
  if (usersForEmail.length > 0) {
    Promise.all(
      usersForEmail.map((user) =>
        sendEmail({
          to: user.email!,
          subject: `P10: ${title}`,
          text: `${description}\n\nVisit P10 to view this notification.`,
        })
      )
    ).catch((err) => log.error("sendNotificationToMany email error:", err))
  }
}
