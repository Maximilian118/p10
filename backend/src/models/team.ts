import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface teamType {
  _id: ObjectId
  icon: string
  emblem: string
  logo: string
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
  icon: string
  emblem: string
  logo?: string | null
  name: string
  nationality: string
  inceptionDate: string
  drivers?: ObjectId[]
}

const teamSchema = new mongoose.Schema<teamType>({
  icon: { type: String, required: true }, // Compressed emblem icon URL in AWS S3.
  emblem: { type: String, required: true }, // Full quality emblem URL in AWS S3.
  logo: { type: String, required: false }, // Team logo with sponsors URL in AWS S3 (optional).
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
