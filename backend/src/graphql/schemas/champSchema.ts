const champInput = `
  type Champ {
    _id: ID!
    name: String!
    icon: String
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  input champInput {
    name: String!
    icon: String
  }
`
export default champInput
