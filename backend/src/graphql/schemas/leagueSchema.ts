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
    missedRounds: Int!
    position: Int!
  }

  # Enriched invite with timestamp for expiry tracking.
  type LeagueInvite {
    championship: Champ
    invitedAt: String!
  }

  # League settings.
  type LeagueSettings {
    maxChampionships: Int!
    inviteOnly: Boolean!
  }

  # Winner/runner-up reference in season history.
  type LeagueSeasonWinner {
    championship: Champ
    adjudicator: User
  }

  # Snapshot of a completed league season.
  type LeagueSeasonHistory {
    season: Int!
    championships: [LeagueMember!]!
    winner: LeagueSeasonWinner
    runnerUp: LeagueSeasonWinner
    finalizedAt: String!
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
    invited: [LeagueInvite]
    settings: LeagueSettings!
    season: Int!
    seasonEndedAt: String
    seasonEndStandings: [LeagueMember]
    history: [LeagueSeasonHistory!]!
    lastRoundStartedAt: String
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
    inviteOnly: Boolean
  }

  # Input for updating league settings.
  input UpdateLeagueSettingsInput {
    name: String
    icon: String
    profile_picture: String
    maxChampionships: Int
    inviteOnly: Boolean
  }
`

export default leagueSchema
