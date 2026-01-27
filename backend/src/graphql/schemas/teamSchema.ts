const teamSchema = `
  type TeamStats {
    inceptionDate: String!
    nationality: String!
  }

  type Team {
    _id: String!
    icon: String!
    emblem: String!
    dominantColour: String
    name: String!
    series: [Series!]
    drivers: [Driver]
    stats: TeamStats!
    official: Boolean
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
    icon: String
    emblem: String
    name: String!
    nationality: String!
    inceptionDate: String!
    drivers: [ID!]
  }
`
export default teamSchema
