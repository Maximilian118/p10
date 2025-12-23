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

  # Driver entry for a round - tracks driver performance.
  type DriverEntry {
    driver: Driver!
    points: Int!
    totalPoints: Int!
    position: Int!
    positionDrivers: Int!
    positionActual: Int!
  }

  # Team/constructor entry for a round - tracks team performance.
  type TeamEntry {
    team: Team!
    drivers: [Driver!]!
    points: Int!
    totalPoints: Int!
    position: Int!
    positionConstructors: Int!
  }

  # A single round - self-contained snapshot.
  type Round {
    round: Int!
    status: RoundStatus!
    winner: User
    runnerUp: User
    competitors: [CompetitorEntry!]!
    drivers: [DriverEntry!]!
    teams: [TeamEntry!]!
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
    series: Series!
    pointsStructure: [PointsStructureEntry!]!
    adjudicator: Adjudicator!
    rulesAndRegs: [Rule!]!
    settings: ChampSettings!
    champBadges: [Badge!]!
    waitingList: [User!]!
    history: [ChampHistory!]
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
    series: ID!
    rounds: Int!
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

  # Input for updating betting window settings.
  input BettingWindowSettingsInput {
    autoOpen: Boolean
    autoOpenTime: Int
    autoClose: Boolean
    autoCloseTime: Int
  }

  # Input for updating round automation settings.
  input RoundAutomationSettingsInput {
    autoNextRound: Boolean
    autoNextRoundTime: Int
  }

  # Input for updating automation settings.
  input AutomationSettingsInput {
    enabled: Boolean
    bettingWindow: BettingWindowSettingsInput
    round: RoundAutomationSettingsInput
  }

  # Input for updating voting settings (protests and ruleChanges).
  input VotingSettingsInput {
    alwaysVote: Boolean
    allowMultiple: Boolean
    expiry: Int
  }

  # Input for updating championship settings.
  input ChampSettingsInput {
    name: String
    icon: String
    profile_picture: String
    rounds: Int
    maxCompetitors: Int
    pointsStructure: [PointsStructureInput!]
    inviteOnly: Boolean
    active: Boolean
    automation: AutomationSettingsInput
    protests: VotingSettingsInput
    ruleChanges: VotingSettingsInput
  }

  # Response type for multiple championships.
  type Champs {
    array: [Champ!]!
    tokens: [String!]
  }

  # Response type for deleted championship.
  type DeletedChamp {
    _id: ID!
    name: String!
    tokens: [String!]
  }
`

export default champSchema
