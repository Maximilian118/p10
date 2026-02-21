import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"
import { ProtestStatus, Vote } from "./protest"

// Status of a round in the championship lifecycle.
// prettier-ignore
export type RoundStatus = "waiting" | "countDown" | "betting_open" | "betting_closed" | "results" | "completed"

// Snapshot of a deleted user for display purposes.
export interface DeletedUserSnapshot {
  _id: ObjectId
  name: string
  icon: string
}

// An amount of manually adjusted points by an adjudicator
// via an official pentalty or a simple points subtraction/addition.
export interface PointsAdjustment {
  adjustment: number // The amount of points adjusted
  type: "manual" | "penalty" // Was this the adjudicator simply clicking and add or subtract arrows or is this an official penalty?
  reason?: string | null // If this is an official penalty, why was this given?
  updated_at: string | null // In case the adjudicator had to update this ruling.
  created_at: string | null // When the adjustment was first made.
}

// Tracks which badges have been discovered (earned at least once) in this championship.
// Bounded at O(badges) - much smaller than tracking all user awards.
export interface DiscoveredBadgeEntry {
  badge: ObjectId // The badge that was discovered
  discoveredBy: ObjectId // First user to earn this badge
  discoveredAt: string // When it was first discovered
}

// Competitor entry within a round - contains all data for that competitor for that round.
export interface CompetitorEntry {
  competitor: ObjectId // The user _id of the competitor
  bet: ObjectId | null // Driver they've bet on this round (null if no bet placed).
  points: number // Points earned THIS round.
  totalPoints: number // Cumulative points the user has earned this season.
  grandTotalPoints: number // Single source of truth for display: totalPoints + sum(adjustments).
  adjustment?: PointsAdjustment[] // An amount of manually adjusted points by an adjudicator.
  position: number // Position in standings AFTER this round.
  deleted?: boolean // Is this competitor a deleted user?
  deletedUserSnapshot?: DeletedUserSnapshot // Preserved display data for deleted users.
  badgesAwarded?: ObjectId[] // Badge IDs earned THIS round (populated by resultsHandler).
  updated_at: string | null // In case the user has changed their mind during the betting process.
  created_at: string | null // When they first placed their bet.
}

// Which driver qualified where this round and how many points did they earn?
export interface DriverEntry {
  driver: ObjectId // The _id of the driver
  points: number // The amount of points this driver earned this round.
  totalPoints: number // Cumulative points the driver has earned this season.
  grandTotalPoints: number // Single source of truth for display: totalPoints + sum(adjustments).
  adjustment?: PointsAdjustment[] // An amount of manually adjusted points by an adjudicator.
  position: number // Which position did the driver finish in regards to the p10 game?
  positionDrivers: number // Which position is the driver in if the drivers were competing for a p10 championship this season? I.E who has the most totalPoints after this round?
  positionActual: number // The real life position this driver qualified in this round.
}

// Which constructor qualified where this round and how many points did their drivers earn?
export interface TeamEntry {
  team: ObjectId // The _id of the team
  drivers: ObjectId[] // Which drivers were driving for this constructor this round?
  points: number // The amount of points this constructor earned this round collectively between their drivers.
  totalPoints: number // Cumulative points the constructor has earned this season.
  grandTotalPoints: number // Single source of truth for display: totalPoints + sum(adjustments).
  adjustment?: PointsAdjustment[] // An amount of manually adjusted points by an adjudicator.
  position: number // Which position did the constructor finish in regards to the p10 game?
  positionConstructors: number // Which position is the constructor in if the constructors were competing for a p10 championship this season? I.E which team has the most totalPoints after this round?
}

// A single round - self-contained snapshot of the championship at that point.
export interface Round {
  round: number // Which round is it in the championship?
  status: RoundStatus // Current status of the round
  statusChangedAt: string | null // ISO timestamp when status was last changed (for 24h expiry)
  resultsProcessed: boolean // Has resultsHandler() already processed this round? Prevents double execution.
  competitors: CompetitorEntry[] // All of the competitors in the champ and their data for this round.
  drivers: DriverEntry[] // All of the drivers in the champ and their data for this round.
  randomisedDrivers: DriverEntry[] // Randomized order of drivers for betting_open display.
  teams: TeamEntry[] // All of the constructors in the champ and their data for this round.
  winner: ObjectId | null // Did a competitor score the maximum amout of points this round?
  runnerUp: ObjectId | null // The runner-up competitor for this round.
}

// Points structure - how many points for each position.
export interface PointsStructureEntry {
  position: number // 1 = correct pick, 2 = second closest, etc.
  points: number // How many points for this position?
}

// Adjudicator tracking.
export interface AdjudicatorHistory {
  adjudicator: ObjectId // Who was the adjudicator?
  fromDateTime: string // When was the role of adjudicator assigned to this person?
  toDateTime: string // When was the role of adjudicator removed from this person?
}

// The vote to change a RuleOrReg or RuleOrReg Subsection
export interface PendingChanges {
  competitor: ObjectId // Who lodged the protest.
  status: ProtestStatus // Current status of the protest.
  title: string // Title of the protest.
  description: string // Description of the protest.
  votes: Vote[] // Votes from competitors.
  expiry: string // Timestamp for when the protest expires
}

// Rule history entry for tracking changes.
export interface RuleHistoryEntry {
  text: string // What did this rule or reg previously say?
  updatedBy: ObjectId // Who created this?
  updated_at: string // Timestamp of when this subsection was created
}

// Subsection of a rule/regulation.
export interface RuleSubsection {
  text: string // Description of this rule or reg subsection
  pendingChanges: PendingChanges[] // Open change votes for this Subsection
  history: RuleHistoryEntry[] // History of this subsection
  created_by: ObjectId // Who created this rule or reg
  created_at: string // Timestamp of when this subsection was created
}

// A single rule or regulation with history tracking.
export interface RuleOrReg {
  default: boolean // Is this Rule a default?
  text: string // Description of this rule or reg
  created_by: ObjectId // Who created this rule or reg?
  pendingChanges: PendingChanges[] // Open change votes for this RuleOrReg
  history: RuleHistoryEntry[] // Previous itterations of this rule or reg
  subsections: RuleSubsection[] // Any subsections this rule or reg has
  created_at: string // Timestamp of when this rule or reg was created
}

export interface Adjudicator {
  current: ObjectId // Which user is the adjudicator of this championship?
  fromDateTime: string // Timestamp of when this adjudicator was assigned
  history: AdjudicatorHistory[] // The history of this championships adjudicators
}

export interface SeasonHistory {
  season: number // Which season was it?
  adjudicator: Adjudicator // Who was the adjudicator?
  drivers: ObjectId[] // Which drivers were in the championship this season?
  rounds: Round[] // All of the recorded rounds for this season
  pointsStructure: PointsStructureEntry[] // What was the points structure?
}

// THE MAIN KAHUNA
// Protests use one-way referencing to the Champ they were created for
export interface ChampType {
  _id: ObjectId
  name: string // Name of the Championship
  icon: string // Heavily Compressed champ image
  profile_picture: string // Lightly Compressed champ image

  // Current state
  season: number // Current Season
  active: boolean // Is the champ active? Can be marked as inactive by adjudicator

  // The core data.
  rounds: Round[]

  // Configuration
  series: ObjectId // Which series is this championship based upon?
  league?: ObjectId | null // Which league this championship belongs to (null = none). Enforces 1-league constraint.
  pointsStructure: PointsStructureEntry[] // What's the points structure of this championship?

  adjudicator: Adjudicator

  // Rules and Regulations for this championship.
  rulesAndRegs: RuleOrReg[]

  settings: {
    skipCountDown: boolean // Skip countdown view, go straight to betting_open when starting a round
    skipResults: boolean // Skip results view, go straight to completed when results are ready
    inviteOnly: boolean // Is the championship invite only? Only adjudicator can invite users to the champ if true
    maxCompetitors: number // The maximum amount of users that can be added as a competitor of this championship
    competitorsCanBet: boolean // Can competitors bet for themselves during betting_open?
    protests: {
      alwaysVote: boolean // Do protests go straight to the voting process when lodged?
      allowMultiple: boolean // Can a competitor lodge multiple protests at once?
      expiry: number // Number of mins in the future protests for this champ expire. Default 1 week.
    }
    ruleChanges: {
      alwaysVote: boolean // Do ruleChanges go straight to the voting process when lodged?
      allowMultiple: boolean // Can a competitor lodge multiple ruleChanges at once?
      expiry: number // Number of mins in the future ruleChanges for this champ expire. Default 1 week.
    }
    automation: {
      enabled: boolean // Can only enable with compatible driver groups
      bettingWindow: {
        autoOpen: boolean
        autoOpenTime: number // How many mins before Qualifying starts do we open the betting window?
        autoOpenData: {
          // Data retrieved from API's in regards to the next qualifying session start time
          timestamp: string // Next qualifying start data and time
          updated_at: string // When was timestamp last updated?
        }
        autoClose: boolean
        autoCloseTime: number // How many mins after Qualifying starts do we close the betting window?
      }
      round: {
        autoNextRound: boolean
        autoNextRoundTime: number // How many mins after Qualifying finishes do we mark the round as "completed" and move to the next?
      }
      audio: {
        enabled: boolean // enable/disable audio samples to be played through the frontend at certain trigger points.
        triggers: {
          bettingWindowOpen: string[] // Audio Samples in an array to be picked from at random on betting window open
          bettingWindowClosed: string[] // Audio Samples in an array to be picked from at random on betting window closed
        }
      }
    }
    admin: {
      adjCanSeeBadges: boolean // Can the adjudicator see hidden/undiscovered badges?
    }
  }

  // Badges that can be awarded.
  champBadges: ObjectId[]

  // Tracks which badges have been discovered (earned at least once) in this championship.
  // Bounded at O(badges) - much smaller than tracking all user awards.
  discoveredBadges: DiscoveredBadgeEntry[]

  // Championship-level competitors array - THE source of truth for who is competing.
  competitors: ObjectId[]

  // A waiting list of users that would like to join the championship but can't because it's full
  waitingList: ObjectId[]

  // Users banned from this championship - cannot rejoin.
  banned: ObjectId[]

  // Users kicked from this championship - can rejoin later.
  kicked: ObjectId[]

  // Users invited to this championship - can accept to join.
  invited: ObjectId[]

  // Season end state - drives the 24h ChampionshipFinishView on frontend.
  seasonEndedAt: string | null // ISO timestamp when the season was archived
  seasonEndStandings: CompetitorEntry[] | null // Final round standings snapshot for display

  // History of each round of each season of this championship
  history: SeasonHistory[]

  // Meta
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: ChampType
}

// Schema for points adjustment by adjudicator.
const pointsAdjustmentSchema = new mongoose.Schema(
  {
    adjustment: { type: Number, required: true },
    type: { type: String, enum: ["manual", "penalty"], default: "manual" },
    reason: { type: String, default: null },
    updated_at: { type: String, default: null },
    created_at: { type: String, default: null },
  },
  { _id: false },
)

// Schema for deleted user snapshot - preserved display data for deleted users.
const deletedUserSnapshotSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.ObjectId, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
  },
  { _id: false },
)

// Schema for competitor entry within a round.
const competitorEntrySchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    bet: { type: mongoose.Schema.ObjectId, ref: "Driver", default: null },
    points: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    // Single source of truth for display in view === "competitors": totalPoints + sum(adjustments).
    grandTotalPoints: { type: Number, default: 0 },
    adjustment: { type: [pointsAdjustmentSchema], default: [] },
    position: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    deletedUserSnapshot: { type: deletedUserSnapshotSchema, default: null },
    badgesAwarded: [{ type: mongoose.Schema.ObjectId, ref: "Badge", default: [] }],
    updated_at: { type: String, default: null },
    created_at: { type: String, default: null },
  },
  { _id: false },
)

// Schema for driver entry within a round - tracks driver performance.
const driverEntrySchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.ObjectId, required: true, ref: "Driver" },
    points: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    // Single source of truth for display in view === "drivers": totalPoints + sum(adjustments).
    grandTotalPoints: { type: Number, default: 0 },
    adjustment: { type: [pointsAdjustmentSchema], default: [] },
    position: { type: Number, default: 0 },
    positionDrivers: { type: Number, default: 0 },
    positionActual: { type: Number, default: 0 },
  },
  { _id: false },
)

// Schema for team/constructor entry within a round - tracks team performance.
const teamEntrySchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.ObjectId, required: true, ref: "Team" },
    drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }],
    points: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    // Single source of truth for display in view === "teams": totalPoints + sum(adjustments).
    grandTotalPoints: { type: Number, default: 0 },
    adjustment: { type: [pointsAdjustmentSchema], default: [] },
    position: { type: Number, default: 0 },
    positionConstructors: { type: Number, default: 0 },
  },
  { _id: false },
)

// Schema for a round - self-contained snapshot.
const roundSchema = new mongoose.Schema(
  {
    round: { type: Number, required: true },
    status: {
      type: String,
      enum: ["waiting", "countDown", "betting_open", "betting_closed", "results", "completed"],
      default: "waiting",
    },
    statusChangedAt: { type: String, default: null },
    resultsProcessed: { type: Boolean, default: false }, // Prevents double execution of resultsHandler()
    competitors: [competitorEntrySchema],
    drivers: [driverEntrySchema],
    randomisedDrivers: [driverEntrySchema],
    teams: [teamEntrySchema],
    winner: { type: mongoose.Schema.ObjectId, ref: "User", default: null },
    runnerUp: { type: mongoose.Schema.ObjectId, ref: "User", default: null },
  },
  { _id: false },
)

// Schema for points structure.
const pointsStructureSchema = new mongoose.Schema(
  {
    position: { type: Number, required: true },
    points: { type: Number, required: true },
  },
  { _id: false },
)

// Schema for adjudicator history.
const adjudicatorHistorySchema = new mongoose.Schema(
  {
    adjudicator: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    fromDateTime: { type: String, required: true },
    toDateTime: { type: String, required: true },
  },
  { _id: false },
)

// Schema for vote on pending changes.
const voteSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    vote: { type: Boolean, required: true },
  },
  { _id: false },
)

// Schema for pending changes to rules/subsections.
const pendingChangesSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    status: {
      type: String,
      enum: ["adjudicating", "voting", "denied", "passed"],
      default: "adjudicating",
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    votes: [voteSchema],
    expiry: { type: String, required: true },
  },
  { _id: false },
)

// Schema for rule history entry.
const ruleHistorySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    updated_at: { type: String, required: true },
  },
  { _id: false },
)

// Schema for rule subsection.
const ruleSubsectionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    pendingChanges: [pendingChangesSchema],
    history: [ruleHistorySchema],
    created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    created_at: { type: String, default: moment().format() },
  },
  { _id: false },
)

// Schema for rules and regulations with history tracking.
const ruleSchema = new mongoose.Schema(
  {
    default: { type: Boolean, default: false },
    text: { type: String, required: true },
    created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    pendingChanges: [pendingChangesSchema],
    history: [ruleHistorySchema],
    subsections: [ruleSubsectionSchema],
    created_at: { type: String, default: moment().format() },
  },
  { _id: false },
)

// Schema for championship history (archived seasons).
const SeasonHistorySchema = new mongoose.Schema(
  {
    season: { type: Number, required: true },
    adjudicator: {
      current: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      fromDateTime: { type: String, required: true },
      history: [adjudicatorHistorySchema],
    },
    drivers: [{ type: mongoose.Schema.ObjectId, ref: "Driver" }],
    rounds: [roundSchema],
    pointsStructure: [pointsStructureSchema],
  },
  { _id: false },
)

// Main championship schema.
const champSchema = new mongoose.Schema<ChampType>({
  // Identity
  name: { type: String, required: true },
  icon: { type: String, default: "" },
  profile_picture: { type: String, default: "" },

  // Current state
  season: { type: Number, required: true, default: 1 },
  active: { type: Boolean, default: true },

  // Core data - all round and competitor data lives here.
  rounds: [roundSchema],

  // Configuration
  series: { type: mongoose.Schema.ObjectId, required: true, ref: "Series" },
  league: { type: mongoose.Schema.ObjectId, ref: "League", default: null }, // Which league this championship belongs to.
  pointsStructure: [pointsStructureSchema],
  adjudicator: {
    current: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    fromDateTime: { type: String, default: moment().format() },
    history: [adjudicatorHistorySchema],
  },

  // Rules and regulations.
  rulesAndRegs: [ruleSchema],

  // Settings.
  settings: {
    skipCountDown: { type: Boolean, default: false },
    skipResults: { type: Boolean, default: false },
    inviteOnly: { type: Boolean, default: false },
    maxCompetitors: { type: Number, default: 24 },
    competitorsCanBet: { type: Boolean, default: true },
    protests: {
      alwaysVote: { type: Boolean, default: false },
      allowMultiple: { type: Boolean, default: false },
      expiry: { type: Number, default: 10080 },
    },
    ruleChanges: {
      alwaysVote: { type: Boolean, default: false },
      allowMultiple: { type: Boolean, default: false },
      expiry: { type: Number, default: 10080 },
    },
    automation: {
      enabled: { type: Boolean, default: false },
      bettingWindow: {
        autoOpen: { type: Boolean, default: false },
        autoOpenTime: { type: Number, default: 10 },
        autoOpenData: {
          timestamp: { type: String, default: "" },
          updated_at: { type: String, default: "" },
        },
        autoClose: { type: Boolean, default: false },
        autoCloseTime: { type: Number, default: 5 },
      },
      round: {
        autoNextRound: { type: Boolean, default: false },
        autoNextRoundTime: { type: Number, default: 60 },
      },
      audio: {
        enabled: { type: Boolean, default: false },
        triggers: {
          bettingWindowOpen: [{ type: String }],
          bettingWindowClosed: [{ type: String }],
        },
      },
    },
    admin: {
      adjCanSeeBadges: { type: Boolean, default: true },
    },
  },

  // Badges
  champBadges: [{ type: mongoose.Schema.ObjectId, ref: "Badge" }],

  // Tracks which badges have been discovered (earned at least once) in this championship.
  discoveredBadges: [
    {
      badge: { type: mongoose.Schema.ObjectId, ref: "Badge" },
      discoveredBy: { type: mongoose.Schema.ObjectId, ref: "User" },
      discoveredAt: { type: String },
    },
  ],

  // Championship-level competitors - source of truth for who is competing.
  competitors: [{ type: mongoose.Schema.ObjectId, ref: "User" }],

  // Waiting list (position is array index).
  waitingList: [{ type: mongoose.Schema.ObjectId, ref: "User" }],

  // Banned users - cannot rejoin the championship.
  banned: [{ type: mongoose.Schema.ObjectId, ref: "User" }],

  // Kicked users - can rejoin later.
  kicked: [{ type: mongoose.Schema.ObjectId, ref: "User" }],

  // Invited users - can accept to join.
  invited: [{ type: mongoose.Schema.ObjectId, ref: "User" }],

  // Season end state - drives the 24h ChampionshipFinishView on frontend.
  seasonEndedAt: { type: String, default: null },
  seasonEndStandings: { type: [competitorEntrySchema], default: null },

  // History of each season.
  history: [SeasonHistorySchema],

  // Meta
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
  created_at: { type: String, default: moment().format() },
  updated_at: { type: String, default: moment().format() },
})

const Champ = mongoose.model<ChampType>("Champ", champSchema)

export default Champ
