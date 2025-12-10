import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface driverGroupType {
  _id: ObjectId
  url: string // NEED TO CHANGE THIS TO THE NORMAL icon and profile_picture WORKFLOW
  name: string // Name of the driverGroup
  championships: ObjectId[] // All the championships this driverGroup is used in
  drivers: ObjectId[] // All the drivers in this group
  created_by: ObjectId // The user that created the DriverGroup
  canAutomate: boolean // Determines if this DriverGroup can be used to automate certain features in a championship
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: driverGroupType
}

export interface driverGroupInputType {
  _id: ObjectId
  url: string
  name: string
  drivers: ObjectId[]
}

const driverGroupSchema = new mongoose.Schema<driverGroupType>({
  url: { type: String, required: true }, // URL to an image in AWS S3.
  name: { type: String, required: true }, // Name of the driver group.
  championships: [{ type: mongoose.Schema.ObjectId, ref: "Champ" }], // Championships that this driver group is being used for.
  drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }], // Drivers that belong in this driver group.
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the driver group.
  canAutomate: { type: Boolean, default: false }, // By default a driverGroup can't be used for automation.
  created_at: { type: String, default: moment().format() }, // When the driver group was created.
  updated_at: { type: String, default: moment().format() }, // When the driver group was updated.
})

const DriverGroup = mongoose.model<driverGroupType>("DriverGroup", driverGroupSchema)

export default DriverGroup
