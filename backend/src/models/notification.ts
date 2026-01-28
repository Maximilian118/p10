import { ObjectId } from "mongodb"
import { userBadgeSnapshotType } from "./user"

// Notification types for different events.
export type NotificationTypeEnum =
  | "champ_invite"
  | "badge_earned"
  | "round_started"
  | "results_posted"
  | "kicked"
  | "banned"
  | "promoted"
  | "user_joined" // New: when a user joins your championship

// Array of valid notification types for runtime validation.
export const NOTIFICATION_TYPES: NotificationTypeEnum[] = [
  "champ_invite",
  "badge_earned",
  "round_started",
  "results_posted",
  "kicked",
  "banned",
  "promoted",
  "user_joined",
]

// Notification object stored in user's notifications array.
export interface NotificationType {
  _id: ObjectId
  type: NotificationTypeEnum
  title: string
  description: string
  read: boolean
  // Optional championship reference for deep linking.
  champId?: ObjectId
  champName?: string
  champIcon?: string
  // Optional badge snapshot for badge earned notifications.
  badgeSnapshot?: userBadgeSnapshotType
  createdAt: string
}

// User's email notification preferences.
export interface NotificationSettingsType {
  emailChampInvite: boolean
  emailBadgeEarned: boolean
  emailRoundStarted: boolean
  emailResultsPosted: boolean
  emailKicked: boolean
  emailBanned: boolean
  emailPromoted: boolean
  emailUserJoined: boolean
}

// Default notification settings (all enabled).
export const defaultNotificationSettings: NotificationSettingsType = {
  emailChampInvite: true,
  emailBadgeEarned: true,
  emailRoundStarted: true,
  emailResultsPosted: true,
  emailKicked: true,
  emailBanned: true,
  emailPromoted: true,
  emailUserJoined: true,
}

// Map notification type to settings key.
export const notificationTypeToSettingsKey: Record<NotificationTypeEnum, keyof NotificationSettingsType> = {
  champ_invite: "emailChampInvite",
  badge_earned: "emailBadgeEarned",
  round_started: "emailRoundStarted",
  results_posted: "emailResultsPosted",
  kicked: "emailKicked",
  banned: "emailBanned",
  promoted: "emailPromoted",
  user_joined: "emailUserJoined",
}
