import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// Status of a protest in its lifecycle.
export type ProtestStatus = "adjudicating" | "voting" | "denied" | "passed"

// Vote on a protest.
export interface Vote {
  competitor: ObjectId
  vote: boolean
}

export interface ProtestType {
  _id: ObjectId

  // Championship reference.
  championship: ObjectId

  // Core protest data.
  competitor: ObjectId // Who lodged the protest.
  status: ProtestStatus // Current status of the protest.
  title: string // Title of the protest.
  description: string // Description of the protest.
  votes: Vote[] // Votes from competitors.
  expiry: string // Timestamp for when the protest expires

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
  status: {
    type: String,
    enum: ["adjudicating", "voting", "denied", "passed"],
    default: "adjudicating",
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  votes: [voteSchema],
  expiry: { type: String, required: true },
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

const Protest = mongoose.model<ProtestType>("Protest", protestSchema)

export default Protest
