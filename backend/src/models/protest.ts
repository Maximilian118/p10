import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface protestType {
  _id: ObjectId
  championship: ObjectId
  title: string
  description: string
  vote: boolean
  voteArr: {
    user: ObjectId
    approve: boolean
  }[]
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: protestType
}

const protestSchema = new mongoose.Schema<protestType>({
  championship: { type: mongoose.Schema.ObjectId, required: true, ref: "Champ" }, // The championship this protest was created for.
  title: { type: String, required: true }, // Title of the protest.
  description: { type: String, required: true }, // Description of the protest.
  vote: { type: Boolean, default: false }, // Allow the current competitors of the championship to vote on the protest.
  voteArr: [
    {
      // All of the users in the champ.
      user: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      approve: { type: Boolean, default: false }, // true = yes, false = no.
    },
  ],
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The user that created the protest.
  created_at: { type: String, default: moment().format() }, // When the protest was created.
  updated_at: { type: String, default: moment().format() }, // When the protest was updated.
})

const Protest = mongoose.model<protestType>("Protest", protestSchema)

export default Protest
