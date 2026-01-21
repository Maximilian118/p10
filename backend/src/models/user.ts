import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

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
  _id: ObjectId                    // Original champ ID (for badge matching)
  name: string                     // Champ name
  icon: string                     // Champ icon URL
  season: number                   // Current/final season

  // User's stats (updated each round, frozen when deleted)
  position: number                 // User's current/final position
  positionChange: number | null    // Position change from previous round
  totalPoints: number              // User's total points
  lastPoints: number               // Points from last completed round
  roundsCompleted: number          // Number of completed rounds

  // Champ-level stats
  totalRounds: number              // Total rounds in championship
  competitorCount: number          // Number of competitors
  maxCompetitors: number           // Max competitors setting
  discoveredBadges: number         // Badges discovered (awardedTo.length > 0)
  totalBadges: number              // Total badges in champ

  deleted: boolean                 // True if champ no longer exists in DB
  updated_at: string               // When snapshot was last updated
}

export interface userType extends Omit<userInputType, "email"> {
  _id: ObjectId
  email: string | null // Nullable for privacy (non-owners get null).
  championships: userChampSnapshotType[] // Embedded Championship snapshots (permanent)
  badges: userBadgeSnapshotType[] // Embedded badge snapshots (permanent)
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
