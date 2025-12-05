// GraphQL schema definitions for Championship type and inputs
const champSchema = `
  type Champ {
    _id: ID!
    name: String!
    icon: String
    profile_picture: String
    season: Int!
    rounds: [Round!]!
    standings: [Standing!]!
    adjudicator: Adjudicator!
    settings: ChampSettings!
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  type Bet {
    competitor: ID!
    driver: ID!
    timestamp: String!
  }

  type Round {
    round: Int!
    completed: Boolean!
    bets: [Bet!]!
  }

  type Standing {
    competitor: User!
    active: Boolean!
    status: String!
    results: [RoundResult!]!
  }

  type RoundResult {
    round: Int!
    points: Int!
  }

  type AdjudicatorRound {
    season: Int!
    round: Int!
    timestamp: String!
  }

  type AdjudicatorHistory {
    adjudicator: User!
    since: String!
    rounds: [AdjudicatorRound!]!
  }

  type Adjudicator {
    current: User!
    since: String!
    rounds: [AdjudicatorRound!]!
    history: [AdjudicatorHistory!]!
  }

  type ChampSettings {
    inviteOnly: Boolean!
    maxCompetitors: Int!
  }

  input champInput {
    name: String!
    icon: String
    profile_picture: String
    rounds: [RoundInput!]!
    driverGroup: ID!
    inviteOnly: Boolean
    maxCompetitors: Int
    pointsStructure: [PointsStructureInput!]!
    rulesAndRegs: RulesAndRegsInput!
    champBadges: [ChampBadgeInput!]!
  }

  input RoundInput {
    round: Int!
    completed: Boolean!
  }

  input PointsStructureInput {
    result: Int!
    points: Int!
  }

  input RulesAndRegsInput {
    default: Boolean!
    list: [RuleOrRegInput!]!
  }

  input RuleOrRegInput {
    text: String!
    subsections: [RuleOrRegSubsectionInput]
  }

  input RuleOrRegSubsectionInput {
    text: String!
  }

  input ChampBadgeInput {
    _id: ID
    url: String
    name: String
    rarity: Int
    awardedHow: String
    awardedDesc: String
    zoom: Int
    isDefault: Boolean!
  }

  type Champs {
    array: [Champ!]!
    tokens: [String!]
  }
`
export default champSchema
