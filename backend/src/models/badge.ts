import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface badgeType {
  _id: ObjectId
  championship?: ObjectId // Optional - null for default/template badges.
  url: string
  name: string
  customName?: string
  rarity: number
  awardedHow: string
  awardedDesc: string
  zoom: number
  isDefault: boolean
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: badgeType
}

// Response type for API - allows nullable fields for hidden badges.
// Badge visibility is determined by discoveredBadges on Championship.
// Hidden badges have url/name/etc set to null, discovered badges have real values.
export interface badgeResponseType {
  _id: ObjectId
  championship?: ObjectId // Optional - null for default/template badges.
  url: string | null
  name: string | null
  customName?: string | null
  rarity: number
  awardedHow: string | null
  awardedDesc: string | null
  zoom: number
  isDefault: boolean
  created_at: string
  updated_at: string
  tokens?: string[]
}

const badgeSchema = new mongoose.Schema<badgeType>({
  championship: { type: mongoose.Schema.ObjectId, ref: "Champ" }, // Optional - null for default/template badges.
  url: { type: String, required: true }, // URL to an image in AWS S3.
  name: { type: String, required: true }, // Name of the badge (from badgeRewardOutcomes).
  customName: { type: String }, // Optional user-provided custom name override.
  rarity: { type: Number, required: true, default: 0 }, // 0 = Common, 1 = Uncommon, 2 = Rare, 3 = Epic, 4 = Legendary, 5 = Mythic.
  awardedHow: { type: String, required: true }, // A short description of how the badge was awarded. Also used for function refs.
  awardedDesc: { type: String, required: true }, // A long description of how the badge was awarded.
  zoom: { type: Number, default: 100 }, // The level of zoom on the picture to apply to the image. E.G Width and height.
  isDefault: { type: Boolean, default: false }, // Whether this is a default/template badge reusable across championships.
  created_at: { type: String, default: moment().format() }, // When the badge was created.
  updated_at: { type: String, default: moment().format() }, // When the badge was updated.
  // Note: Award tracking is on User.badges[] (source of truth) and Championship.discoveredBadges (first discovery).
})

const Badge = mongoose.model<badgeType>("Badge", badgeSchema)

export default Badge
