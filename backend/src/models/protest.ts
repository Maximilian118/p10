import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// Status of a protest in its lifecycle.
export type ProtestStatus = "adjudicating" | "voting" | "denied" | "passed"

// Vote on a protest.
export interface Vote {
  competitor: ObjectId // Which competitor voted?
  vote: boolean // Did they vote yes or no?
}

export interface ProtestType {
  _id: ObjectId

  // Championship reference.
  championship: ObjectId

  // Core protest data.
  competitor: ObjectId // Who lodged the protest.
  accused?: ObjectId // Optional: the competitor the protest is against.
  status: ProtestStatus // Current status of the protest.
  title: string // Title of the protest.
  description: string // Description of the protest.
  votes: Vote[] // Votes from competitors.
  expiry: string // Timestamp for when the protest expires.
  pointsAllocated: boolean // Has the adjudicator allocated points after determination?
  filerPoints?: number // Points awarded to filer after determination.
  accusedPoints?: number // Points deducted from accused after determination.

  // DB metadata.
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: ProtestType
}

// Schema for a vote on a protest.
const voteSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    vote: { type: Boolean, required: true },
  },
  { _id: false },
)

// Protest schema.
const protestSchema = new mongoose.Schema<ProtestType>({
  championship: { type: mongoose.Schema.ObjectId, required: true, ref: "Champ" },
  competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
  accused: { type: mongoose.Schema.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["adjudicating", "voting", "denied", "passed"],
    default: "adjudicating",
  },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  votes: [voteSchema],
  expiry: { type: String, required: true },
  pointsAllocated: { type: Boolean, default: false },
  filerPoints: { type: Number },
  accusedPoints: { type: Number },
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

// TTL index for auto-deletion of determined protests after 1 year.
protestSchema.index(
  { updated_at: 1 },
  {
    expireAfterSeconds: 365 * 24 * 60 * 60,
    partialFilterExpression: {
      status: { $in: ["passed", "denied"] },
      pointsAllocated: true,
    },
  },
)

const Protest = mongoose.model<ProtestType>("Protest", protestSchema)

export default Protest
