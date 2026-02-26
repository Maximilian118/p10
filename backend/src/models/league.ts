import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// Individual competitor's contribution to a round's league score.
export interface LeagueContributionType {
  competitor: ObjectId
  driver: ObjectId | null // Null for non-bettors (no driver selected).
  driverPosition: number
  predictionScore: number
}

// Best/worst prediction insight for a round.
export interface LeaguePredictionInsightType {
  competitor: ObjectId
  driver: ObjectId | null
  driverPosition: number
  predictionScore: number
}

// Per-round insights for a championship within a league.
export interface LeagueScoreInsightsType {
  totalCompetitors: number
  competitorsWhoBet: number
  avgP10Distance: number
  bestPrediction: LeaguePredictionInsightType | null
  worstPrediction: LeaguePredictionInsightType | null
  p10Hits: number
  contributions: LeagueContributionType[]
}

// Per-round scoring data for a championship within a league.
export interface LeagueScoreType {
  champRoundNumber: number
  predictionScore: number // 0-100%, championship average for this round
  completedAt: string
  insights: LeagueScoreInsightsType
}

// A championship's membership record within a league.
export interface LeagueMemberType {
  championship: ObjectId
  adjudicator: ObjectId // Who enrolled this championship
  joinedAt: string
  leftAt?: string
  active: boolean
  scores: LeagueScoreType[]
  cumulativeScore: number // Sum of all prediction scores
  roundsCompleted: number
  cumulativeAverage: number // cumulativeScore / roundsCompleted (raw, unpenalized)
  missedRounds: number // Rounds missed while in league (5% penalty each)
  position: number // League rank
}

// Enriched invite with timestamp for expiry tracking.
export interface LeagueInviteType {
  championship: ObjectId
  invitedAt: string // When the invite was sent
}

// League settings.
export interface LeagueSettingsType {
  maxChampionships: number
  inviteOnly: boolean
}

// Snapshot of a completed league season.
export interface LeagueSeasonHistoryType {
  season: number // Year (2025, 2026, etc.)
  championships: LeagueMemberType[] // Final standings snapshot
  winner: { championship: ObjectId; adjudicator: ObjectId } | null
  runnerUp: { championship: ObjectId; adjudicator: ObjectId } | null
  finalizedAt: string
}

// Main League document.
export interface LeagueType {
  _id: ObjectId
  name: string
  icon: string
  profile_picture: string
  series: ObjectId
  creator: ObjectId
  championships: LeagueMemberType[]
  invited: LeagueInviteType[] // Enriched invites with timestamps for expiry.
  settings: LeagueSettingsType
  season: number // Current year/season (e.g., 2025)
  seasonEndedAt: string | null // When season ended (triggers 24h results view)
  seasonEndStandings: LeagueMemberType[] | null // Frozen final standings for results view
  history: LeagueSeasonHistoryType[] // Past season snapshots
  lastRoundStartedAt: string | null // When any member last started a round (for invite expiry)
  locked?: boolean // Computed server-side, not stored in DB
  lockThreshold?: number // Computed server-side, not stored in DB
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: LeagueType
}

// Sub-schema for individual competitor contributions.
const leagueContributionSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, ref: "User" },
    driver: { type: mongoose.Schema.ObjectId, ref: "Driver" },
    driverPosition: { type: Number, default: 0 },
    predictionScore: { type: Number, default: 0 },
  },
  { _id: false },
)

// Sub-schema for best/worst prediction insights.
const leaguePredictionInsightSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, ref: "User" },
    driver: { type: mongoose.Schema.ObjectId, ref: "Driver" },
    driverPosition: { type: Number, default: 0 },
    predictionScore: { type: Number, default: 0 },
  },
  { _id: false },
)

// Sub-schema for per-round insights.
const leagueScoreInsightsSchema = new mongoose.Schema(
  {
    totalCompetitors: { type: Number, default: 0 },
    competitorsWhoBet: { type: Number, default: 0 },
    avgP10Distance: { type: Number, default: 0 },
    bestPrediction: { type: leaguePredictionInsightSchema, default: null },
    worstPrediction: { type: leaguePredictionInsightSchema, default: null },
    p10Hits: { type: Number, default: 0 },
    contributions: [leagueContributionSchema],
  },
  { _id: false },
)

// Sub-schema for per-round scoring data.
const leagueScoreSchema = new mongoose.Schema(
  {
    champRoundNumber: { type: Number, required: true },
    predictionScore: { type: Number, default: 0 },
    completedAt: { type: String, default: "" },
    insights: { type: leagueScoreInsightsSchema, default: () => ({}) },
  },
  { _id: false },
)

// Sub-schema for championship membership in a league.
const leagueMemberSchema = new mongoose.Schema(
  {
    championship: { type: mongoose.Schema.ObjectId, ref: "Champ", required: true },
    adjudicator: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    joinedAt: { type: String, default: "" },
    leftAt: { type: String, default: null },
    active: { type: Boolean, default: true },
    scores: [leagueScoreSchema],
    cumulativeScore: { type: Number, default: 0 },
    roundsCompleted: { type: Number, default: 0 },
    cumulativeAverage: { type: Number, default: 0 },
    missedRounds: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
  },
  { _id: false },
)

// Sub-schema for enriched invites with timestamp for expiry tracking.
const leagueInviteSchema = new mongoose.Schema(
  {
    championship: { type: mongoose.Schema.ObjectId, ref: "Champ", required: true },
    invitedAt: { type: String, required: true },
  },
  { _id: false },
)

// Sub-schema for league settings.
const leagueSettingsSchema = new mongoose.Schema(
  {
    maxChampionships: { type: Number, default: 12 },
    inviteOnly: { type: Boolean, default: false },
  },
  { _id: false },
)

// Sub-schema for league season history winner/runner-up reference.
const leagueSeasonWinnerSchema = new mongoose.Schema(
  {
    championship: { type: mongoose.Schema.ObjectId, ref: "Champ", required: true },
    adjudicator: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  },
  { _id: false },
)

// Sub-schema for league season history snapshots.
const leagueSeasonHistorySchema = new mongoose.Schema(
  {
    season: { type: Number, required: true },
    championships: [leagueMemberSchema],
    winner: { type: leagueSeasonWinnerSchema, default: null },
    runnerUp: { type: leagueSeasonWinnerSchema, default: null },
    finalizedAt: { type: String, required: true },
  },
  { _id: false },
)

// Main league schema.
const leagueSchema = new mongoose.Schema<LeagueType>({
  name: { type: String, required: true },
  icon: { type: String, required: true }, // Compressed league image URL in AWS S3.
  profile_picture: { type: String, required: true }, // Full quality league image URL in AWS S3.
  series: { type: mongoose.Schema.ObjectId, ref: "Series", required: true },
  creator: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  championships: [leagueMemberSchema],
  invited: [leagueInviteSchema], // Enriched invites with expiry timestamps.
  settings: { type: leagueSettingsSchema, default: () => ({}) },
  season: { type: Number, default: () => new Date().getFullYear() }, // Current year/season.
  seasonEndedAt: { type: String, default: null }, // When season ended (24h results view trigger).
  seasonEndStandings: { type: [leagueMemberSchema], default: null }, // Frozen final standings.
  history: [leagueSeasonHistorySchema], // Past season snapshots.
  lastRoundStartedAt: { type: String, default: null }, // When any member last started a round.
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

const League = mongoose.model<LeagueType>("League", leagueSchema)

export default League
