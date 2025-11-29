const driverGroupSchema = `
  type DriverGroup {
    _id: ID!
    url: String!
    name: String!
    championships: [Champ!]
    drivers: [Driver!]
    created_by: User
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }

  type DriverGroups {
    array: [DriverGroup!]!
    tokens: [String!]
  }

  input driverGroupInput {
    _id: ID
    created_by: ID
    url: String
    name: String!
    drivers: [ID!]
  }
`
export default driverGroupSchema
