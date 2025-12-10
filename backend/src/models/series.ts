import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface seriesType {
  _id: ObjectId
  url: string // NEED TO CHANGE THIS TO THE NORMAL icon and profile_picture WORKFLOW
  name: string // Name of the series
  championships: ObjectId[] // All the championships this series is used in
  drivers: ObjectId[] // All the drivers in this series
  created_by: ObjectId // The user that created the Series
  canAutomate: boolean // Determines if this Series can be used to automate certain features in a championship
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: seriesType
}

export interface seriesInputType {
  _id: ObjectId
  url: string
  name: string
  drivers: ObjectId[]
}

const seriesSchema = new mongoose.Schema<seriesType>({
  url: { type: String, required: true }, // URL to an image in AWS S3.
  name: { type: String, required: true }, // Name of the series.
  championships: [{ type: mongoose.Schema.ObjectId, ref: "Champ" }], // Championships that this series is being used for.
  drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }], // Drivers that belong in this series.
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the series.
  canAutomate: { type: Boolean, default: false }, // By default a series can't be used for automation.
  created_at: { type: String, default: moment().format() }, // When the series was created.
  updated_at: { type: String, default: moment().format() }, // When the series was updated.
})

const Series = mongoose.model<seriesType>("Series", seriesSchema)

export default Series
