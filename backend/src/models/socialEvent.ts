import mongoose from "mongoose"
import { ObjectId } from "mongodb"
import moment from "moment"

// Literal union of all social event kinds.
export type SocialEventKind =
  | "badge_earned"
  | "champ_joined"
  | "champ_created"
  | "season_won"
  | "season_runner_up"
  | "round_won"
  | "round_perfect_bet"
  | "win_streak"
  | "points_milestone"
  | "rounds_milestone"
  | "user_joined_platform"
  | "adjudicator_promoted"

// Array of valid social event kinds for runtime validation.
export const SOCIAL_EVENT_KINDS: SocialEventKind[] = [
  "badge_earned",
  "champ_joined",
  "champ_created",
  "season_won",
  "season_runner_up",
  "round_won",
  "round_perfect_bet",
  "win_streak",
  "points_milestone",
  "rounds_milestone",
  "user_joined_platform",
  "adjudicator_promoted",
]

// User snapshot for denormalized display (avoids joins in feed queries).
export interface UserSnapshotType {
  name: string
  icon: string
}

// Flexible payload that varies by event kind.
export interface SocialEventPayloadType {
  badgeName?: string
  badgeUrl?: string
  badgeRarity?: number
  badgeAwardedHow?: string
  champId?: ObjectId
  champName?: string
  champIcon?: string
  season?: number
  roundNumber?: number
  driverName?: string
  pointsEarned?: number
  streakCount?: number
  milestoneValue?: number
  milestoneLabel?: string
}

// Main SocialEvent document type.
export interface SocialEventType {
  _id: ObjectId
  kind: SocialEventKind
  user: ObjectId
  userSnapshot: UserSnapshotType
  payload: SocialEventPayloadType
  commentCount: number
  created_at: string
}

// User's social event privacy preferences.
export interface SocialEventSettingsType {
  badge_earned_epic: boolean
  badge_earned_legendary: boolean
  badge_earned_mythic: boolean
  champ_joined: boolean
  champ_created: boolean
  season_won: boolean
  season_runner_up: boolean
  round_won: boolean
  round_perfect_bet: boolean
  win_streak: boolean
  points_milestone: boolean
  rounds_milestone: boolean
  user_joined_platform: boolean
  adjudicator_promoted: boolean
}

// Default social event settings (matches the "Default On" column from the plan).
export const defaultSocialEventSettings: SocialEventSettingsType = {
  badge_earned_epic: true,
  badge_earned_legendary: true,
  badge_earned_mythic: true,
  champ_joined: true,
  champ_created: true,
  season_won: true,
  season_runner_up: true,
  round_won: true,
  round_perfect_bet: false,
  win_streak: true,
  points_milestone: true,
  rounds_milestone: false,
  user_joined_platform: true,
  adjudicator_promoted: true,
}

// User location type for geolocation features.
export interface UserLocationType {
  city?: string
  region?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

const socialEventSchema = new mongoose.Schema<SocialEventType>({
  kind: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.ObjectId, ref: "User", required: true, index: true },
  userSnapshot: {
    name: { type: String, required: true },
    icon: { type: String, required: true },
  },
  payload: {
    // Badge events.
    badgeName: { type: String },
    badgeUrl: { type: String },
    badgeRarity: { type: Number },
    badgeAwardedHow: { type: String },
    // Championship events.
    champId: { type: mongoose.Schema.ObjectId, ref: "Champ" },
    champName: { type: String },
    champIcon: { type: String },
    season: { type: Number },
    // Round events.
    roundNumber: { type: Number },
    driverName: { type: String },
    pointsEarned: { type: Number },
    // Streak/milestone events.
    streakCount: { type: Number },
    milestoneValue: { type: Number },
    milestoneLabel: { type: String },
  },
  commentCount: { type: Number, default: 0 },
  created_at: { type: String, default: moment().format(), index: true },
})

// Compound index for feed queries: events by followed users sorted by time.
socialEventSchema.index({ user: 1, created_at: -1 })

const SocialEvent = mongoose.model<SocialEventType>("SocialEvent", socialEventSchema)

export default SocialEvent
