const leagueSchema = `
  # Individual competitor's contribution to a round's league score.
  type LeagueContribution {
    competitor: User
    driver: Driver
    driverPosition: Int!
    predictionScore: Float!
  }

  # Best/worst prediction insight for a round.
  type LeaguePredictionInsight {
    competitor: User
    driver: Driver
    driverPosition: Int!
    predictionScore: Float!
  }

  # Per-round insights for a championship in the league.
  type LeagueScoreInsights {
    totalCompetitors: Int!
    competitorsWhoBet: Int!
    avgP10Distance: Float!
    bestPrediction: LeaguePredictionInsight
    worstPrediction: LeaguePredictionInsight
    p10Hits: Int!
    contributions: [LeagueContribution!]!
  }

  # A round's score for a championship in the league.
  type LeagueScore {
    champRoundNumber: Int!
    predictionScore: Float!
    completedAt: String!
    insights: LeagueScoreInsights!
  }

  # Championship membership in a league.
  type LeagueMember {
    championship: Champ
    adjudicator: User
    joinedAt: String!
    leftAt: String
    active: Boolean!
    scores: [LeagueScore!]!
    cumulativeScore: Float!
    roundsCompleted: Int!
    cumulativeAverage: Float!
    position: Int!
  }

  # League settings.
  type LeagueSettings {
    maxChampionships: Int!
  }

  # Main League type.
  type League {
    _id: ID!
    name: String!
    icon: String
    profile_picture: String
    series: Series
    creator: User
    championships: [LeagueMember!]!
    settings: LeagueSettings!
    locked: Boolean!
    lockThreshold: Int!
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  # Response for multiple leagues.
  type Leagues {
    array: [League!]!
    tokens: [String!]
  }

  # Input for creating a league.
  input CreateLeagueInput {
    name: String!
    icon: String!
    profile_picture: String!
    series: ID!
    maxChampionships: Int
  }

  # Input for updating league settings.
  input UpdateLeagueSettingsInput {
    name: String
    icon: String
    profile_picture: String
    maxChampionships: Int
  }
`

export default leagueSchema
