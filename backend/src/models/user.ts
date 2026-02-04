import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"
import { NotificationType, NotificationSettingsType } from "./notification"

export interface userInputType {
  name: string
  email: string
  password: string | null
  passConfirm: string
  icon: string
  profile_picture: string
}

// User's embedded badge snapshot.
// IMMUTABLE: Once created, snapshots should NEVER be modified or deleted.
// They preserve exactly how the badge looked when the user earned it.
// This ensures badges persist even if the original Badge document is deleted or edited.
//
// FEATURED BADGES SYSTEM:
// Users can showcase up to 6 badges in "featured" slots on their profile.
// - featured: null → Badge is NOT featured (default)
// - featured: 1-6  → Badge is displayed in that slot position
//
// When a badge is dragged to a featured slot in the UI, we update this field
// to match the slot position. Only one badge can occupy each position.
// Setting a new badge to a position automatically clears any existing badge
// from that position.
export interface userBadgeSnapshotType {
  _id: ObjectId
  championship: ObjectId
  url: string
  name: string
  customName?: string
  rarity: number
  awardedHow: string
  awardedDesc: string
  zoom: number
  awarded_at: string
  featured?: number | null
}

// Snapshots of the champs the user is currently a part of or has been a part of.
// Champs the user currently is a part of are actively updated with the latest info after each round.
// Champs that have been deleted will be preserved here with the last known data after its last round.
export interface userChampSnapshotType {
  _id: ObjectId // Original champ ID (for badge matching)
  name: string // Champ name
  icon: string // Champ icon URL
  season: number // Current/final season

  // User's stats (updated each round, frozen when deleted)
  position: number // User's current/final position
  positionChange: number | null // Position change from previous round
  totalPoints: number // User's total points
  lastPoints: number // Points from last completed round
  roundsCompleted: number // Number of completed rounds

  // Champ-level stats
  totalRounds: number // Total rounds in championship
  competitorCount: number // Number of competitors
  maxCompetitors: number // Max competitors setting
  discoveredBadges: number // Badges discovered in championship (earned at least once)
  totalBadges: number // Total badges in champ

  deleted: boolean // True if champ no longer exists in DB
  updated_at: string // When snapshot was last updated
}

export interface userType extends Omit<userInputType, "email"> {
  _id: ObjectId
  email: string | null // Nullable for privacy (non-owners get null).
  championships: userChampSnapshotType[] // Embedded Championship snapshots (permanent)
  badges: userBadgeSnapshotType[] // Embedded badge snapshots (permanent)
  notifications: NotificationType[] // User's notifications
  notificationsCount?: number // Computed unread count (not stored in DB)
  notificationSettings: NotificationSettingsType // Email notification preferences
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
  }
  refresh_count: number
  logged_in_at: string
  created_at: string
  updated_at: string
  tokens: string[] | null // Nullable (non-owners get null).
  _doc: userType
}

export interface userTypeMongo extends userType {
  save: () => Promise<{}>
  markModified: (path: string) => void
}

// Notification badge snapshot subdocument schema.
// IMPORTANT: Defined as a separate schema (not inline) so Mongoose returns `undefined`
// instead of an empty `{}` object when no badge data exists. This prevents GraphQL errors
// when querying notifications that don't have badge data (e.g., champ_invite notifications).
const notificationBadgeSnapshotSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.ObjectId, ref: "Badge", required: true }, // Original Badge document ID
    championship: { type: mongoose.Schema.ObjectId, ref: "Champ", required: true }, // Championship the badge belongs to
    url: { type: String, required: true }, // Badge image URL
    name: { type: String, required: true }, // Badge name
    customName: { type: String }, // Optional custom name given when awarded
    rarity: { type: Number, required: true }, // Rarity level (1-5)
    awardedHow: { type: String, required: true }, // Criteria key (e.g., "WIN_ROUND")
    awardedDesc: { type: String, required: true }, // Human-readable description of how it was earned
    zoom: { type: Number, default: 100 }, // Image zoom level
    awarded_at: { type: String, required: true }, // ISO timestamp when badge was earned
    featured: { type: Number }, // Featured slot position (1-6) or null
  },
  { _id: false } // Don't auto-generate _id - we use the Badge's _id
)

const userSchema = new mongoose.Schema<userType>({
  name: { type: String, required: true }, // User Name.
  email: { type: String, required: true }, // User Email.
  password: { type: String, required: false, min: 8 }, // User encryptied password.
  icon: { type: String, required: true }, // User Icon. Same image as Profile Picture but compressed to aprox 0.05mb.
  profile_picture: { type: String, required: true }, // User Profile Picture. Compressed to aprox 0.5mb.
  // Embedded championship snapshots - updated each round, preserved when champ deleted.
  championships: [
    {
      _id: { type: mongoose.Schema.ObjectId, required: true }, // Original champ ID
      name: { type: String, required: true },
      icon: { type: String, required: true },
      season: { type: Number, required: true },
      position: { type: Number, default: 0 },
      positionChange: { type: Number, default: null },
      totalPoints: { type: Number, default: 0 },
      lastPoints: { type: Number, default: 0 },
      roundsCompleted: { type: Number, default: 0 },
      totalRounds: { type: Number, required: true },
      competitorCount: { type: Number, default: 1 },
      maxCompetitors: { type: Number, required: true },
      discoveredBadges: { type: Number, default: 0 },
      totalBadges: { type: Number, default: 0 },
      deleted: { type: Boolean, default: false },
      updated_at: { type: String, default: moment().format() },
    },
  ],
  // Embedded badge snapshots - permanent copies of badge data at time of earning.
  badges: [
    {
      _id: { type: mongoose.Schema.ObjectId, required: true }, // Original badge ID
      url: { type: String, required: true },
      name: { type: String, required: true },
      customName: { type: String },
      rarity: { type: Number, required: true },
      awardedHow: { type: String, required: true },
      awardedDesc: { type: String, required: true },
      zoom: { type: Number, default: 100 },
      championship: { type: mongoose.Schema.ObjectId, ref: "Champ", required: true },
      awarded_at: { type: String, default: moment().format() },
      featured: { type: Number, default: null }, // Featured slot position (1-6) or null
    },
  ],
  // User notifications array.
  // Notifications are embedded documents (not references) for fast access on login.
  notifications: [
    {
      _id: { type: mongoose.Schema.ObjectId, required: true }, // Unique notification ID
      type: { type: String, required: true }, // Notification type: "champ_invite" | "badge_earned" | "round_started" | "results_posted" | "kicked" | "banned" | "promoted"
      title: { type: String, required: true }, // Display title
      description: { type: String, required: true }, // Display description
      read: { type: Boolean, default: false }, // Whether user has seen this notification
      // Optional championship reference for deep linking (used by most notification types)
      champId: { type: mongoose.Schema.ObjectId, ref: "Champ" }, // Championship ID for navigation
      champName: { type: String }, // Championship name (denormalized for display)
      champIcon: { type: String }, // Championship icon URL (denormalized for display)
      // Optional badge snapshot - ONLY set for "badge_earned" notifications.
      badgeSnapshot: { type: notificationBadgeSnapshotSchema, default: null },
      // Protest notification fields - set for protest-related notification types.
      protestId: { type: mongoose.Schema.ObjectId, ref: "Protest" },
      protestTitle: { type: String },
      filerName: { type: String },
      filerIcon: { type: String },
      accusedName: { type: String },
      accusedIcon: { type: String },
      filerPoints: { type: Number },
      accusedPoints: { type: Number },
      protestStatus: { type: String },
      createdAt: { type: String, default: moment().format() }, // ISO timestamp
    },
  ],
  // Email notification preferences.
  notificationSettings: {
    emailChampInvite: { type: Boolean, default: true },
    emailBadgeEarned: { type: Boolean, default: true },
    emailRoundStarted: { type: Boolean, default: true },
    emailResultsPosted: { type: Boolean, default: true },
    emailKicked: { type: Boolean, default: true },
    emailBanned: { type: Boolean, default: true },
    emailPromoted: { type: Boolean, default: true },
    emailUserJoined: { type: Boolean, default: true },
    emailProtestFiled: { type: Boolean, default: true },
    emailProtestVoteRequired: { type: Boolean, default: true },
    emailProtestPassed: { type: Boolean, default: true },
    emailProtestDenied: { type: Boolean, default: true },
    emailProtestExpired: { type: Boolean, default: true },
  },
  refresh_count: { type: Number, default: 0 }, // Refresh count.
  logged_in_at: { type: String, default: moment().format() }, // Last logged in.
  created_at: { type: String, default: moment().format() }, // When the user signed up.
  updated_at: { type: String, default: moment().format() }, // Last user activity.
  permissions: {
    admin: { type: Boolean, default: false },
    adjudicator: { type: Boolean, default: false },
    guest: { type: Boolean, default: false },
  },
})

const User = mongoose.model<userType>("User", userSchema)

export default User
