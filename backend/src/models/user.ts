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

export interface userType extends Omit<userInputType, "email"> {
  _id: ObjectId
  email: string | null // Nullable for privacy (non-owners get null).
  championships: object[]
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
  championships: [{ type: mongoose.Schema.ObjectId, ref: "Champ" }], // Championships the user is part of.
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
