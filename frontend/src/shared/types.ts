import { userType } from "./localStorage"

// Type for viewing another user's profile (populated data).
export interface userProfileType {
  _id: string
  name: string
  icon: string
  profile_picture: string
  championships: ChampType[]
  badges: badgeType[]
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
  }
  created_at: string
}

export interface formType {
  icon: File | null
  profile_picture: File | null
  bodyIcon?: File | null
  bodyPicture?: File | null
  name?: string
  champName?: string
  email?: string
}

export interface formErrType {
  name?: string
  champName?: string
  dropzone: string
  [key: string]: string | undefined | number
}

// Points structure - how many points for each position.
export type pointsStructureEntryType = {
  position: number
  points: number
}

export type pointsStructureType = pointsStructureEntryType[]

// Rule history entry for tracking changes.
export type ruleHistoryType = {
  text: string
  updatedBy: userType
  updated_at: string
}

// Pending changes type for rule change voting.
export interface PendingChangesType {
  competitor: userType
  status: ProtestStatus
  title: string
  description: string
  votes: VoteType[]
  expiry: string
}

// Rule subsection with pending changes.
export type ruleSubsectionType = {
  text: string
  pendingChanges: PendingChangesType[]
  history: ruleHistoryType[]
  created_by: userType
  created_at: string
}

// Rule or regulation with history tracking.
export type ruleOrRegType = {
  default: boolean
  text: string
  created_by: userType
  pendingChanges: PendingChangesType[]
  history: ruleHistoryType[]
  subsections: ruleSubsectionType[]
  created_at: string
}

// rulesAndRegs is now just an array of rules.
export type rulesAndRegsType = ruleOrRegType[]

export interface badgeType {
  _id?: string
  championship?: ChampType
  url: string
  name: string
  rarity: number
  awardedTo?: userType[]
  awardedHow: string
  awardedDesc: string
  zoom: number
  created_at?: string
  updated_at?: string
  file?: File | null
  default?: boolean
}

export interface teamType {
  _id?: string
  url: string
  name: string
  series: seriesType[]
  drivers: driverType[]
  stats: {
    inceptionDate: string
    nationality: string
  }
  created_by?: userType | string
  created_at?: string
  updated_at?: string
  tokens?: string[]
  _doc?: teamType
}

export interface driverType {
  _id?: string
  icon: string
  profile_picture: string
  body: string
  name: string
  driverID: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}` | ""
  teams: teamType[]
  series: seriesType[]
  stats: {
    nationality: string | null
    heightCM: number | null
    weightKG: number | null
    birthday: string | null
    moustache: boolean
    mullet: boolean
  }
  created_by?: userType | string
  created_at?: string
  updated_at?: string
}

export interface seriesType {
  _id?: string
  url: string
  name: string
  championships: ChampType[]
  drivers: driverType[]
  created_by?: userType | string
  created_at?: string
  updated_at?: string
  tokens?: string[]
}

// Status types for championship.
export type RoundStatus = "waiting" | "betting_open" | "betting_closed" | "completed"
export type ProtestStatus = "adjudicating" | "voting" | "denied" | "passed"

// Competitor entry within a round - all data for that competitor in that round.
export interface CompetitorEntryType {
  competitor: userType
  bet: driverType | null
  points: number // Points earned THIS round.
  totalPoints: number // Cumulative points AFTER this round.
  position: number // Position in standings AFTER this round.
  updated_at: string | null // When they last changed their bet.
  created_at: string | null // When they first placed their bet.
}

// A single round - self-contained snapshot.
export interface RoundType {
  round: number
  status: RoundStatus
  winner: userType | null // Competitor who scored max points (null if none).
  runnerUp: userType | null // Runner-up competitor for this round.
  competitors: CompetitorEntryType[]
}

// Adjudicator history entry.
export interface AdjudicatorHistoryType {
  adjudicator: userType
  fromDateTime: string
  toDateTime: string
}

// Adjudicator type (extracted for reuse).
export interface AdjudicatorType {
  current: userType
  fromDateTime: string
  history: AdjudicatorHistoryType[]
}

// Championship history entry (archived season).
export interface ChampHistoryType {
  season: number
  adjudicator: AdjudicatorType
  drivers: driverType[]
  rounds: RoundType[]
  pointsStructure: pointsStructureType
}

// Automation settings for championship.
export interface AutomationSettingsType {
  enabled: boolean
  bettingWindow: {
    autoOpen: boolean
    autoOpenTime: number
    autoClose: boolean
    autoCloseTime: number
  }
  round: {
    autoNextRound: boolean
    autoNextRoundTime: number
  }
  audio: {
    enabled: boolean
    triggers: {
      bettingWindowOpen: string[]
      bettingWindowClosed: string[]
    }
  }
}

// Vote for a protest.
export interface VoteType {
  competitor: userType
  vote: boolean
}

// Standalone protest type (separate collection, populated).
export interface ProtestType {
  _id: string
  championship: ChampType
  competitor: userType // Who lodged the protest.
  status: ProtestStatus
  title: string
  description: string
  votes: VoteType[]
  created_at: string
  updated_at: string
  tokens: string
}

// Voting settings type (shared by protests and ruleChanges).
export interface VotingSettingsType {
  alwaysVote: boolean
  allowMultiple: boolean
  expiry: number
}

export interface ChampType {
  _id: string
  name: string
  icon: string
  profile_picture: string

  // Current state
  season: number
  active: boolean // Is the champ active?

  // Core data - all rounds with competitor snapshots.
  rounds: RoundType[]

  // Configuration
  series: seriesType
  pointsStructure: pointsStructureType
  adjudicator: AdjudicatorType

  // Rules and regulations.
  rulesAndRegs: rulesAndRegsType

  // Settings.
  settings: {
    inviteOnly: boolean
    maxCompetitors: number
    protests: VotingSettingsType
    ruleChanges: VotingSettingsType
    automation: AutomationSettingsType
  }

  // Badges that can be awarded.
  champBadges: badgeType[]

  // Waiting list (position is array index).
  waitingList: userType[]

  // History of each season.
  history: ChampHistoryType[]

  // Meta
  created_by?: userType | string
  created_at: string
  updated_at: string
  tokens: string
}
