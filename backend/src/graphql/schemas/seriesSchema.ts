const seriesSchema = `
  type Series {
    _id: ID!
    icon: String!
    profile_picture: String!
    name: String!
    shortName: String
    rounds: Int
    hasAPI: Boolean
    official: Boolean
    championships: [Champ!]
    drivers: [Driver!]
    created_by: User
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  type SeriesList {
    array: [Series!]!
    tokens: [String!]
  }

  input seriesInput {
    _id: ID
    created_by: ID
    icon: String
    profile_picture: String
    name: String!
    shortName: String
    rounds: Int
    drivers: [ID!]
  }
`
export default seriesSchema
