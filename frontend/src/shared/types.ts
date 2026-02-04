import { userType, userBadgeSnapshotType, userChampSnapshotType, NotificationType, NotificationTypeEnum, NotificationSettingsType } from "./localStorage"

// Re-export for convenience.
export type { userType, userType as fullUserType, userBadgeSnapshotType, userChampSnapshotType, NotificationType, NotificationTypeEnum, NotificationSettingsType }

// State for badge selection mode on profile page.
export interface SelectionModeState {
  active: boolean
  targetSlot: number | null
}

// Type for viewing another user's profile (populated data).
export interface userProfileType {
  _id: string
  name: string
  icon: string
  profile_picture: string
  championships: userChampSnapshotType[]
  badges: userBadgeSnapshotType[]
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
  }
  created_at: string
}

export interface formType {
  icon: File | string | null
  profile_picture?: File | string | null
  body?: File | string | null
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
  url: string | null
  name: string | null
  customName?: string | null
  rarity: number
  awardedHow: string | null
  awardedDesc: string | null
  zoom: number
  created_at?: string
  updated_at?: string
  file?: File | null
  previewUrl?: string // Object URL for displaying image before S3 upload.
  isDefault?: boolean
}

export interface teamType {
  _id?: string
  icon: string
  emblem: string
  dominantColour?: string
  name: string
  series: seriesType[]
  drivers: driverType[]
  official?: boolean
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
  official?: boolean
  stats: {
    nationality: string | null
    heightCM: number | null
    weightKG: number | null
    birthday: string | null
    moustache: boolean
    mullet: boolean
    roundsCompleted: number
    roundsWon: number
    champsCompleted: number
    champsWon: number
    positionHistory: Record<string, number>
    // Auto-updated stats for badge evaluation (qualifying positions).
    polePositions: number
    topThreeFinishes: number
    p10Finishes: number
    formScore: number
    // API-dependent stats (only available when series.hasAPI === true).
    dnfCount: number
    dnsCount: number
    consecutiveDNFs: number
  }
  created_by?: userType | string
  created_at?: string
  updated_at?: string
}

export interface seriesType {
  _id?: string
  url: string
  name: string
  shortName?: string
  hasAPI?: boolean
  official?: boolean
  championships: ChampType[]
  drivers: driverType[]
  created_by?: userType | string
  created_at?: string
  updated_at?: string
  tokens?: string[]
}

// Status types for championship round lifecycle.
export type RoundStatus = "waiting" | "countDown" | "betting_open" | "betting_closed" | "results" | "completed"
export type ProtestStatus = "adjudicating" | "voting" | "denied" | "passed"

// Points adjustment by adjudicator - manual adjustment or official penalty.
export interface PointsAdjustmentType {
  adjustment: number // The amount of points adjusted (+/-)
  type: "manual" | "penalty" // Manual click adjustment or official penalty
  reason?: string | null // If penalty, why was it given?
  updated_at: string | null
  created_at: string | null
}

// Minimal response from adjustCompetitorPoints mutation.
export interface AdjustmentResultType {
  competitorId: string
  roundIndex: number
  adjustment: PointsAdjustmentType[]
  grandTotalPoints: number
}

// Snapshot of a deleted user for display purposes.
export interface DeletedUserSnapshotType {
  _id: string
  name: string
  icon: string
}

// Competitor entry within a round - all data for that competitor in that round.
export interface CompetitorEntryType {
  competitor: userType | null // Null for deleted users - use deletedUserSnapshot for display.
  bet: driverType | null
  points: number // Points earned THIS round.
  totalPoints: number // Cumulative points AFTER this round.
  grandTotalPoints: number // Single source of truth for display: totalPoints + adjustments.
  adjustment?: PointsAdjustmentType[] // Manual adjustments by adjudicator.
  position: number // Position in standings AFTER this round.
  deleted?: boolean // Is this competitor a deleted user?
  deletedUserSnapshot?: DeletedUserSnapshotType // Preserved display data for deleted users.
  updated_at: string | null // When they last changed their bet.
  created_at: string | null // When they first placed their bet.
}

// Driver entry for a round - tracks driver performance.
export interface DriverEntryType {
  driver: driverType
  points: number // Points earned THIS round.
  totalPoints: number // Cumulative points the driver has earned this season.
  grandTotalPoints: number // Single source of truth for display: totalPoints + adjustments.
  adjustment?: PointsAdjustmentType[] // Manual adjustments by adjudicator.
  position: number // P10 game position this round.
  positionDrivers: number // Driver championship standing (hypothetical).
  positionActual: number // Real-life qualifying position.
}

// Team/constructor entry for a round - tracks team performance.
export interface TeamEntryType {
  team: teamType
  drivers: driverType[] // Drivers racing for this team this round.
  points: number // Combined driver points THIS round.
  totalPoints: number // Cumulative points the team has earned this season.
  grandTotalPoints: number // Single source of truth for display: totalPoints + adjustments.
  adjustment?: PointsAdjustmentType[] // Manual adjustments by adjudicator.
  position: number // P10 game position this round.
  positionConstructors: number // Constructor championship standing (hypothetical).
}

// A single round - self-contained snapshot.
export interface RoundType {
  round: number
  status: RoundStatus
  statusChangedAt: string | null // ISO timestamp for when status changed (for countdown sync).
  resultsProcessed: boolean // Has resultsHandler() already processed this round? Prevents double execution.
  winner: userType | null // Competitor who scored max points (null if none).
  runnerUp: userType | null // Runner-up competitor for this round.
  competitors: CompetitorEntryType[]
  drivers: DriverEntryType[]
  randomisedDrivers: DriverEntryType[]
  teams: TeamEntryType[]
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
  accused?: userType // Optional: the competitor the protest is against.
  status: ProtestStatus
  title: string
  description: string
  votes: VoteType[]
  expiry: string // When the voting period expires.
  pointsAllocated: boolean // Has adjudicator submitted points after determination?
  filerPoints?: number // Points awarded to filer after determination.
  accusedPoints?: number // Points deducted from accused after determination.
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

  // Championship-level competitors (source of truth for who is competing).
  competitors: userType[]

  // Configuration
  series: seriesType
  pointsStructure: pointsStructureType
  adjudicator: AdjudicatorType

  // Rules and regulations.
  rulesAndRegs: rulesAndRegsType

  // Settings.
  settings: {
    skipCountDown: boolean
    skipResults: boolean
    inviteOnly: boolean
    maxCompetitors: number
    competitorsCanBet: boolean
    protests: VotingSettingsType
    ruleChanges: VotingSettingsType
    automation: AutomationSettingsType
    admin?: {
      adjCanSeeBadges: boolean
    }
  }

  // Badges that can be awarded.
  champBadges: badgeType[]

  // Count of discovered badges (badges earned at least once in this championship).
  discoveredBadgesCount: number

  // Waiting list (position is array index).
  waitingList: userType[]

  // Banned users - cannot rejoin the championship.
  banned: userType[]

  // Kicked users - can rejoin the championship later.
  kicked: userType[]

  // Invited users - can accept to join the championship.
  invited: userType[]

  // History of each season.
  history: ChampHistoryType[]

  // Meta
  created_by?: userType | string
  created_at: string
  updated_at: string
  tokens: string
}

// Lightweight championship data for FloatingChampCard.
export interface FloatingChampType {
  _id: string
  name: string
  icon: string
  currentRoundStatus: RoundStatus
  currentRound: number
  totalRounds: number
}
