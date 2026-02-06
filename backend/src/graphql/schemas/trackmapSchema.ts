const trackmapSchema = `
  type TrackmapPoint {
    x: Float!
    y: Float!
  }

  type Trackmap {
    _id: ID!
    trackName: String!
    path: [TrackmapPoint!]!
    pathVersion: Int!
    totalLapsProcessed: Int!
    updated_at: String!
  }
`

export default trackmapSchema
