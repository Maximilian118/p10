import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"
import { PitLaneProfile } from "../services/openF1/types"

// A single 2D coordinate point on the track.
export interface TrackmapPoint {
  x: number
  y: number
}

// Corner label from MultiViewer track data.
export interface TrackmapCorner {
  number: number
  trackPosition: TrackmapPoint
}

// Sector boundary positions as track progress values (0-1).
export interface TrackmapSectorBoundaries {
  startFinish: number
  sector1_2: number
  sector2_3: number
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
  corners: TrackmapCorner[]            // Cached MultiViewer corner labels
  sectorBoundaries: TrackmapSectorBoundaries | null // Derived sector boundary progress values
  pitLaneProfile: PitLaneProfile | null              // Telemetry-derived pit lane profile for exit detection + rendering
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

// Sub-schema for a MultiViewer corner label.
const trackmapCornerSchema = new mongoose.Schema<TrackmapCorner>(
  {
    number: { type: Number, required: true },
    trackPosition: { type: trackmapPointSchema, required: true },
  },
  { _id: false },
)

// Sub-schema for sector boundary progress values.
const sectorBoundariesSchema = new mongoose.Schema<TrackmapSectorBoundaries>(
  {
    startFinish: { type: Number, required: true },
    sector1_2: { type: Number, required: true },
    sector2_3: { type: Number, required: true },
  },
  { _id: false },
)

// Sub-schema for pit lane profile data derived from telemetry.
const pitLaneProfileSchema = new mongoose.Schema<PitLaneProfile>(
  {
    exitSpeed: { type: Number, required: true },
    pitLaneMaxSpeed: { type: Number, required: true },
    pitLaneSpeedLimit: { type: Number, required: true },
    samplesCollected: { type: Number, required: true },
    entryProgress: { type: Number, required: true },
    exitProgress: { type: Number, required: true },
    pitSide: { type: Number, required: true },
    pitSideConfidence: { type: Number, default: 0 },
    referenceWindingCW: { type: Boolean, default: true },
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
  corners: { type: [trackmapCornerSchema], default: [] },
  sectorBoundaries: { type: sectorBoundariesSchema, default: null },
  pitLaneProfile: { type: pitLaneProfileSchema, default: null },
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

const Trackmap = mongoose.model<TrackmapType>("Trackmap", trackmapSchema)

export default Trackmap
