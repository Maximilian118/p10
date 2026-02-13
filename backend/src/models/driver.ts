import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface driverType {
  _id: ObjectId
  icon: string
  profile_picture: string
  body: string
  name: string
  driverID: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}`
  driverNumber?: number
  driverNumberHistory?: number[]
  teams: ObjectId[]
  series: ObjectId[]
  official?: boolean // True = Only admins can modify/delete this driver
  stats: {
    nationality: string
    heightCM: number
    weightKG: number
    birthday: string
    moustache: boolean
    mullet: boolean
    roundsCompleted: number
    roundsWon: number
    champsCompleted: number
    champsWon: number
    positionHistory: Record<string, number>
    // Auto-updated stats for badge evaluation (updated in resultsHandler).
    polePositions: number // Pole positions in qualifying (positionActual === 1)
    topThreeFinishes: number // Top 3 qualifying finishes (positionActual <= 3)
    p10Finishes: number // Times finished exactly P10
    formScore: number // Rolling avg of last 3 positionActual (lower = better)
    // API-dependent stats (only updated when series.hasAPI === true).
    dnfCount: number // Did Not Finish count
    dnsCount: number // Did Not Start count
    consecutiveDNFs: number // Current DNF streak (reset on finish)
  }
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: driverType
}

export interface driverInputType {
  _id?: ObjectId
  created_by: ObjectId
  icon: string
  profile_picture: string
  body: string
  name: string
  driverID: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}`
  teams: ObjectId[]
  series: ObjectId[]
  nationality: string
  heightCM: number
  weightKG: number
  birthday: string
  moustache: boolean
  mullet: boolean
}

const driverSchema = new mongoose.Schema<driverType>({
  icon: { type: String, required: true }, // Headshot icon ~0.1MB in AWS S3.
  profile_picture: { type: String, required: true }, // Headshot full ~1MB in AWS S3.
  body: { type: String, default: "" }, // Body image ~1MB in AWS S3 (optional).
  name: { type: String, required: true }, // Name of the driver.
  driverID: { type: String, required: true },
  driverNumber: { type: Number, default: null }, // Current car number (auto-populated from OpenF1).
  driverNumberHistory: { type: [Number], default: [] }, // Previous car numbers in chronological order.
  teams: [{ type: mongoose.Schema.ObjectId, ref: "Team" }], // Teams that this driver currently races for.
  series: [{ type: mongoose.Schema.ObjectId, ref: "Series" }], // Series that this driver belongs to.
  stats: {
    // An object of stats for the driver.
    nationality: { type: String, required: true },
    heightCM: { type: Number, required: true },
    weightKG: { type: Number, required: true },
    birthday: { type: String, required: true },
    moustache: { type: Boolean, default: false },
    mullet: { type: Boolean, default: false },
    roundsCompleted: { type: Number, default: 0 }, // Total rounds the driver has participated in
    roundsWon: { type: Number, default: 0 }, // Rounds where driver finished P10
    champsCompleted: { type: Number, default: 0 }, // Championships the driver has completed
    champsWon: { type: Number, default: 0 }, // Championships where driver finished 1st in driver standings
    positionHistory: { type: Map, of: Number, default: {} }, // Map of position -> finish count (key "1" = P1 finishes)
    // Auto-updated stats for badge evaluation (updated in resultsHandler).
    polePositions: { type: Number, default: 0 }, // Real race wins (positionActual === 1)
    topThreeFinishes: { type: Number, default: 0 }, // Real podiums (positionActual <= 3)
    p10Finishes: { type: Number, default: 0 }, // Times finished exactly P10
    formScore: { type: Number, default: 0 }, // Rolling avg of last 3 positionActual (lower = better)
    // API-dependent stats (only updated when series.hasAPI === true).
    dnfCount: { type: Number, default: 0 }, // Did Not Finish count
    dnsCount: { type: Number, default: 0 }, // Did Not Start count
    consecutiveDNFs: { type: Number, default: 0 }, // Current DNF streak (reset on finish)
  },
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the driver.
  official: { type: Boolean, default: false }, // Only admins can modify/delete if true.
  created_at: { type: String, default: moment().format() }, // When the driver was created.
  updated_at: { type: String, default: moment().format() }, // When the driver was updated.
})

const Driver = mongoose.model<driverType>("Driver", driverSchema)

export default Driver
