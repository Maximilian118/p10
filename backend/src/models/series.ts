import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface seriesType {
  _id: ObjectId
  icon: string // Compressed series image ~0.1MB in AWS S3
  profile_picture: string // Full quality series image ~1MB in AWS S3
  name: string // Name of the series
  shortName?: string // Short identifier for the series (e.g., "F1" for FIA Formula One World Championship)
  championships: ObjectId[] // All the championships this series is used in
  drivers: ObjectId[] // All the drivers in this series
  created_by: ObjectId // The user that created the Series
  official?: boolean // True = Only admins can modify/delete this series
  hasAPI: boolean // Determines if this Series has an API for live data and automation features
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: seriesType
}

export interface seriesInputType {
  _id: ObjectId
  icon: string
  profile_picture: string
  name: string
  shortName?: string
  drivers: ObjectId[]
}

const seriesSchema = new mongoose.Schema<seriesType>({
  icon: { type: String, required: true }, // Compressed series image URL in AWS S3.
  profile_picture: { type: String, required: true }, // Full quality series image URL in AWS S3.
  name: { type: String, required: true }, // Name of the series.
  shortName: { type: String, required: false }, // Short identifier (e.g., "F1").
  championships: [{ type: mongoose.Schema.ObjectId, ref: "Champ" }], // Championships that this series is being used for.
  drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }], // Drivers that belong in this series.
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the series.
  official: { type: Boolean, default: false }, // Only admins can modify/delete if true.
  hasAPI: { type: Boolean, default: false }, // Whether this series has an API for live data.
  created_at: { type: String, default: moment().format() }, // When the series was created.
  updated_at: { type: String, default: moment().format() }, // When the series was updated.
})

const Series = mongoose.model<seriesType>("Series", seriesSchema)

export default Series
