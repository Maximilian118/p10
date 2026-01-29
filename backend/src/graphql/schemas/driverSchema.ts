const driverSchema = `
  type Stats {
    nationality: String!
    heightCM: Int!
    weightKG: Int!
    birthday: String!
    moustache: Boolean!
    mullet: Boolean!
    positionHistory: JSON!
    roundsCompleted: Int!
    roundsWon: Int!
    champsCompleted: Int!
    champsWon: Int!
    polePositions: Int!
    topThreeFinishes: Int!
    p10Finishes: Int!
    formScore: Float!
    dnfCount: Int!
    dnsCount: Int!
    consecutiveDNFs: Int!
  }

  type Driver {
    _id: ID!
    icon: String!
    profile_picture: String!
    body: String
    name: String!
    driverID: String!
    teams: [Team]
    series: [Series!]
    stats: Stats!
    official: Boolean
    created_by: User!
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  type Drivers {
    array: [Driver!]!
    tokens: [String!]
  }

  input driverInput {
    _id: ID
    created_by: ID
    icon: String
    profile_picture: String
    body: String
    name: String!
    driverID: String!
    teams: [ID!]
    nationality: String!
    heightCM: Int!
    weightKG: Int!
    birthday: String!
    moustache: Boolean!
    mullet: Boolean!
  }
`
export default driverSchema
