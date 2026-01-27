const seriesSchema = `
  type Series {
    _id: ID!
    url: String!
    name: String!
    shortName: String
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
    url: String
    name: String!
    shortName: String
    drivers: [ID!]
  }
`
export default seriesSchema
