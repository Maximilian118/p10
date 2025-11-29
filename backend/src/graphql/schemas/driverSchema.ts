const driverSchema = `
  type Stats {
    nationality: String!
    heightCM: Int!
    weightKG: Int!
    birthday: String!
    moustache: Boolean!
    mullet: Boolean!
  }

  type Driver {
    _id: ID!
    url: String!
    name: String!
    driverID: String!
    teams: [Team]
    driverGroups: [DriverGroup!]
    stats: Stats!
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
    url: String
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
