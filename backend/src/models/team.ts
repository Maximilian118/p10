import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface teamType {
  _id: ObjectId
  url: string
  name: string
  series: ObjectId[]
  drivers: ObjectId[]
  stats: {
    inceptionDate: string
    nationality: string
  }
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: teamType
}

export interface teamInputType {
  _id?: ObjectId
  created_by: ObjectId
  url: string
  name: string
  nationality: string
  inceptionDate: string
}

const teamSchema = new mongoose.Schema<teamType>({
  url: { type: String, required: true }, // URL to an image in AWS S3.
  name: { type: String, required: true }, // Name of the team.
  series: [{ type: mongoose.Schema.ObjectId, ref: "Series" }], // Series that this team competes in.
  drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }], // Drivers that belong in this team.
  stats: {
    inceptionDate: { type: String, required: true }, // Date the team was founded.
    nationality: { type: String, required: true }, // What is teams nationality?
  },
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the team.
  created_at: { type: String, default: moment().format() }, // When the team group was created.
  updated_at: { type: String, default: moment().format() }, // When the team group was updated.
})

const Team = mongoose.model<teamType>("Team", teamSchema)

export default Team
