const teamSchema = `
  type TeamStats {
    inceptionDate: String!
    nationality: String!
  }

  type Team {
    _id: String!
    url: String!
    name: String!
    driverGroups: [DriverGroup!]
    drivers: [Driver]
    stats: TeamStats!
    created_by: User!
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  type Teams {
    array: [Team!]!
    tokens: [String!]
  }

  input teamInput {
    _id: ID
    created_by: ID
    url: String
    name: String!
    nationality: String!
    inceptionDate: String!
  }
`
export default teamSchema
