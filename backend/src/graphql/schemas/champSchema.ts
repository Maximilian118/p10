// GraphQL schema definitions for Championship type and inputs.
const champSchema = `
  # Status types for round lifecycle.
  enum RoundStatus {
    waiting
    countDown
    betting_open
    betting_closed
    results
    completed
  }

  enum ProtestStatus {
    adjudicating
    voting
    denied
    passed
  }

  # Snapshot of a deleted user for display purposes.
  type DeletedUserSnapshot {
    _id: ID!
    name: String!
    icon: String!
  }

  # Points adjustment by adjudicator - manual or penalty.
  type PointsAdjustment {
    adjustment: Int!
    type: String!
    reason: String
    updated_at: String
    created_at: String
  }

  # Minimal response for adjustment mutations.
  type AdjustmentResult {
    competitorId: ID!
    roundIndex: Int!
    adjustment: [PointsAdjustment]!
    grandTotalPoints: Int!
  }

  # Competitor entry within a round - all data for that competitor in that round.
  type CompetitorEntry {
    competitor: User
    bet: Driver
    points: Int!
    totalPoints: Int!
    grandTotalPoints: Int!
    adjustment: [PointsAdjustment]
    position: Int!
    deleted: Boolean
    deletedUserSnapshot: DeletedUserSnapshot
    badgesAwarded: [Badge]
    updated_at: String
    created_at: String
  }

  # Driver entry for a round - tracks driver performance.
  type DriverEntry {
    driver: Driver!
    points: Int!
    totalPoints: Int!
    grandTotalPoints: Int!
    adjustment: [PointsAdjustment]
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
    grandTotalPoints: Int!
    adjustment: [PointsAdjustment]
    position: Int!
    positionConstructors: Int!
  }

  # A single round - self-contained snapshot.
  type Round {
    round: Int!
    status: RoundStatus!
    statusChangedAt: String
    resultsProcessed: Boolean!
    winner: User
    runnerUp: User
    competitors: [CompetitorEntry!]!
    drivers: [DriverEntry!]!
    randomisedDrivers: [DriverEntry!]!
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

  # Minimal response for rules mutations (avoids full Champ population).
  type RulesAndRegsResponse {
    rulesAndRegs: [Rule!]!
    tokens: [String!]
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

  # Admin-only settings.
  type AdminSettings {
    adjCanSeeBadges: Boolean!
  }

  # Championship settings.
  type ChampSettings {
    skipCountDown: Boolean!
    skipResults: Boolean!
    inviteOnly: Boolean!
    maxCompetitors: Int!
    competitorsCanBet: Boolean!
    protests: VotingSettings!
    ruleChanges: VotingSettings!
    automation: AutomationSettings!
    admin: AdminSettings
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
    discoveredBadgesCount: Int!
    competitors: [User!]!
    waitingList: [User!]!
    banned: [User!]!
    kicked: [User!]!
    invited: [User!]!
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

  # Input for adding a new rule to an existing championship.
  input AddRuleInput {
    text: String!
    subsections: [RuleSubsectionInput!]
  }

  # Input for updating an existing rule.
  input UpdateRuleInput {
    ruleIndex: Int!
    text: String!
    subsections: [RuleSubsectionInput!]
  }

  # Input for adding a new subsection to an existing rule.
  input AddSubsectionInput {
    ruleIndex: Int!
    text: String!
  }

  # Input for updating an existing subsection.
  input UpdateSubsectionInput {
    ruleIndex: Int!
    subsectionIndex: Int!
    text: String!
  }

  # Input for deleting a subsection.
  input DeleteSubsectionInput {
    ruleIndex: Int!
    subsectionIndex: Int!
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

  # Input for updating admin settings (admin-only).
  input AdminSettingsInput {
    adjCanSeeBadges: Boolean
  }

  # Input for updating championship settings.
  input ChampSettingsInput {
    name: String
    icon: String
    profile_picture: String
    rounds: Int
    maxCompetitors: Int
    pointsStructure: [PointsStructureInput!]
    skipCountDown: Boolean
    skipResults: Boolean
    inviteOnly: Boolean
    active: Boolean
    competitorsCanBet: Boolean
    automation: AutomationSettingsInput
    protests: VotingSettingsInput
    ruleChanges: VotingSettingsInput
    series: ID
  }

  # Input for updating round status.
  input UpdateRoundStatusInput {
    roundIndex: Int!
    status: RoundStatus!
  }

  # Input for placing a bet.
  input PlaceBetInput {
    roundIndex: Int!
    driverId: ID!
  }

  # Input for a single driver's position in qualifying results.
  input DriverPositionInput {
    driverId: ID!
    positionActual: Int!
  }

  # Input for submitting driver positions after betting closes.
  input SubmitDriverPositionsInput {
    roundIndex: Int!
    driverPositions: [DriverPositionInput!]!
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

  # Lightweight championship data for FloatingChampCard.
  type FloatingChamp {
    _id: ID!
    name: String!
    icon: String
    currentRoundStatus: RoundStatus!
    currentRound: Int!
    totalRounds: Int!
    tokens: [String!]
  }

  # Protest type for the protest system.
  type Protest {
    _id: ID!
    championship: Champ!
    competitor: User!
    accused: User
    status: ProtestStatus!
    title: String!
    description: String!
    votes: [Vote!]!
    expiry: String!
    pointsAllocated: Boolean!
    filerPoints: Int
    accusedPoints: Int
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  # Response type for multiple protests.
  type Protests {
    array: [Protest!]!
    tokens: [String!]
  }

  # Input for creating a protest.
  input CreateProtestInput {
    champId: ID!
    title: String!
    description: String!
    accusedId: ID
  }

  # Input for allocating points after protest determination.
  input AllocateProtestPointsInput {
    protestId: ID!
    filerPoints: Int!
    accusedPoints: Int
  }
`

export default champSchema
