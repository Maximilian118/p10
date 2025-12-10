// GraphQL schema definitions for Championship type and inputs.
const champSchema = `
  # Status types
  enum RoundStatus {
    waiting
    betting_open
    betting_closed
    completed
  }

  enum ProtestStatus {
    adjudicating
    voting
    denied
    passed
  }

  # Competitor entry within a round - all data for that competitor in that round.
  type CompetitorEntry {
    competitor: User!
    bet: Driver
    points: Int!
    totalPoints: Int!
    position: Int!
    updated_at: String
    created_at: String
  }

  # A single round - self-contained snapshot.
  type Round {
    round: Int!
    status: RoundStatus!
    winner: User
    runnerUp: User
    competitors: [CompetitorEntry!]!
  }

  # Points structure entry.
  type PointsStructureEntry {
    position: Int!
    points: Int!
  }

  # Adjudicator history entry.
  type AdjudicatorHistoryEntry {
    adjudicator: User!
    fromDateTime: String!
    toDateTime: String!
  }

  # Adjudicator info.
  type Adjudicator {
    current: User!
    fromDateTime: String!
    history: [AdjudicatorHistoryEntry!]!
  }

  # Vote type for pending changes.
  type Vote {
    competitor: User!
    vote: Boolean!
  }

  # Pending changes for rules/subsections.
  type PendingChanges {
    competitor: User!
    status: ProtestStatus!
    title: String!
    description: String!
    votes: [Vote!]!
    expiry: String!
  }

  # Rule history entry for tracking changes.
  type RuleHistory {
    text: String!
    updatedBy: User!
    updated_at: String!
  }

  # Rule subsection with history tracking.
  type RuleSubsection {
    text: String!
    pendingChanges: [PendingChanges!]!
    history: [RuleHistory!]!
    created_by: User!
    created_at: String!
  }

  # Rule with history tracking and subsections.
  type Rule {
    default: Boolean!
    text: String!
    created_by: User!
    pendingChanges: [PendingChanges!]!
    history: [RuleHistory!]!
    subsections: [RuleSubsection!]!
    created_at: String!
  }

  # Voting settings (shared by protests and ruleChanges).
  type VotingSettings {
    alwaysVote: Boolean!
    allowMultiple: Boolean!
    expiry: Int!
  }

  # Betting window automation settings.
  type BettingWindowSettings {
    autoOpen: Boolean!
    autoOpenTime: Int!
    autoClose: Boolean!
    autoCloseTime: Int!
  }

  # Round automation settings.
  type RoundAutomationSettings {
    autoNextRound: Boolean!
    autoNextRoundTime: Int!
  }

  # Audio trigger settings.
  type AudioTriggers {
    bettingWindowOpen: [String!]!
    bettingWindowClosed: [String!]!
  }

  # Audio automation settings.
  type AudioSettings {
    enabled: Boolean!
    triggers: AudioTriggers!
  }

  # Full automation settings.
  type AutomationSettings {
    enabled: Boolean!
    bettingWindow: BettingWindowSettings!
    round: RoundAutomationSettings!
    audio: AudioSettings!
  }

  # Championship settings.
  type ChampSettings {
    inviteOnly: Boolean!
    maxCompetitors: Int!
    protests: VotingSettings!
    ruleChanges: VotingSettings!
    automation: AutomationSettings!
  }

  # Championship history entry (archived season).
  type ChampHistory {
    season: Int!
    adjudicator: Adjudicator!
    drivers: [Driver!]!
    rounds: [Round!]!
    pointsStructure: [PointsStructureEntry!]!
  }

  # Main Championship type.
  type Champ {
    _id: ID!
    name: String!
    icon: String
    profile_picture: String
    season: Int!
    active: Boolean!
    rounds: [Round!]!
    driverGroup: DriverGroup!
    pointsStructure: [PointsStructureEntry!]!
    adjudicator: Adjudicator!
    rulesAndRegs: [Rule!]!
    settings: ChampSettings!
    champBadges: [Badge!]!
    waitingList: [User!]!
    history: [ChampHistory!]!
    created_by: User
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  # Input for creating a championship.
  input ChampInput {
    name: String!
    icon: String
    profile_picture: String
    driverGroup: ID!
    pointsStructure: [PointsStructureInput!]!
    inviteOnly: Boolean
    maxCompetitors: Int
    rulesAndRegs: [RuleInput!]
    champBadges: [ID!]
  }

  input PointsStructureInput {
    position: Int!
    points: Int!
  }

  input RuleSubsectionInput {
    text: String!
  }

  input RuleInput {
    default: Boolean
    text: String!
    subsections: [RuleSubsectionInput!]
  }

  # Response type for multiple championships.
  type Champs {
    array: [Champ!]!
    tokens: [String!]
  }
`

export default champSchema
