import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// A single replay message with its topic and timestamp.
export interface DemoMessageType {
  topic: string
  data: object
  timestamp: number
}

// Cached demo session with a mid-session snapshot of replay messages.
export interface DemoSessionType {
  _id: ObjectId
  sessionKey: number
  trackName: string
  sessionName: string
  driverCount: number
  sessionEndTs: number
  messages: DemoMessageType[]
  created_at: string
  _doc: DemoSessionType
}

// Demo session schema — stores a trimmed snapshot that fits within BSON 16MB limit.
const demoSessionSchema = new mongoose.Schema<DemoSessionType>({
  sessionKey: { type: Number, required: true, unique: true },
  trackName: { type: String, required: true },
  sessionName: { type: String, required: true },
  driverCount: { type: Number, default: 0 },
  sessionEndTs: { type: Number, default: 0 },
  messages: { type: mongoose.Schema.Types.Mixed, default: [] },
  created_at: { type: String, default: moment().format() },
})

const DemoSession = mongoose.model<DemoSessionType>("DemoSession", demoSessionSchema)

export default DemoSession
