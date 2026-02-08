import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// A single 2D coordinate point on the track.
export interface TrackmapPoint {
  x: number
  y: number
}

// An archived version of a track map from a previous year.
export interface TrackmapHistoryEntry {
  path: TrackmapPoint[]
  totalLapsProcessed: number
  year: number
  archivedAt: string
}

// Full trackmap document stored in MongoDB.
export interface TrackmapType {
  _id: ObjectId
  trackName: string                // Circuit name from OpenF1 meetings endpoint
  previousTrackNames: string[]     // Historical names if the track was renamed
  meetingKeys: number[]            // OpenF1 meeting_keys that contributed to this map
  latestSessionKey: number         // Most recent session_key used
  path: TrackmapPoint[]            // The computed track outline (ordered coordinates)
  pathVersion: number              // Increments on each refinement
  totalLapsProcessed: number       // Number of fast laps that contributed to the path
  history: TrackmapHistoryEntry[]  // Archived versions from previous years
  multiviewerPath: TrackmapPoint[] // Cached MultiViewer high-fidelity track outline
  multiviewerCircuitKey: number | null // MultiViewer circuit key for cache invalidation
  created_at: string
  updated_at: string
  _doc: TrackmapType
}

// Sub-schema for a 2D coordinate point.
const trackmapPointSchema = new mongoose.Schema<TrackmapPoint>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false },
)

// Sub-schema for archived historical track map versions.
const trackmapHistorySchema = new mongoose.Schema<TrackmapHistoryEntry>(
  {
    path: { type: [trackmapPointSchema], required: true },
    totalLapsProcessed: { type: Number, required: true },
    year: { type: Number, required: true },
    archivedAt: { type: String, required: true },
  },
  { _id: false },
)

// Main trackmap schema.
const trackmapSchema = new mongoose.Schema<TrackmapType>({
  trackName: { type: String, required: true, unique: true },
  previousTrackNames: { type: [String], default: [] },
  meetingKeys: { type: [Number], default: [] },
  latestSessionKey: { type: Number, default: 0 },
  path: { type: [trackmapPointSchema], default: [] },
  pathVersion: { type: Number, default: 0 },
  totalLapsProcessed: { type: Number, default: 0 },
  history: { type: [trackmapHistorySchema], default: [] },
  multiviewerPath: { type: [trackmapPointSchema], default: [] },
  multiviewerCircuitKey: { type: Number, default: null },
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

const Trackmap = mongoose.model<TrackmapType>("Trackmap", trackmapSchema)

export default Trackmap
