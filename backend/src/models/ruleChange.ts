import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface ruleChangeType {
  _id: ObjectId
  championship: ObjectId
  title: string
  description: string
  vote: boolean
  voteArr: {
    user: ObjectId
    approve: boolean
  }[]
  voteExipiry: string
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: ruleChangeType
}

const ruleChangeSchema = new mongoose.Schema<ruleChangeType>({
  championship: { type: mongoose.Schema.ObjectId, required: true, ref: "Champ" }, // The championship this rule change request was created for.
  title: { type: String, required: true }, // Title of the rule change request.
  description: { type: String, required: true }, // Description of the rule change request.
  vote: { type: Boolean, default: true }, // Allow the current competitors of the championship to vote on the rule change request.
  voteArr: [
    {
      // All of the users in the champ.
      user: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      approve: { type: Boolean, default: false }, // true = yes, false = no.
    },
  ],
  voteExipiry: { type: String, default: moment().add(1, "M").format() }, // Set vote exipiry date.
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The user that created the rule change request.
  created_at: { type: String, default: moment().format() }, // When the rule change request was created.
  updated_at: { type: String, default: moment().format() }, // When the rule change request was updated.
})

const RuleChange = mongoose.model<ruleChangeType>("RuleChange", ruleChangeSchema)

export default RuleChange
