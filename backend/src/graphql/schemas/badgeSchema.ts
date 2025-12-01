const badgeSchema = `
  type Badge {
    _id: ID!
    championship: String
    url: String!
    name: String!
    rarity: Int!
    awardedTo: [String!]!
    awardedHow: String!
    awardedDesc: String!
    zoom: Int!
    isDefault: Boolean!
    created_at: String!
    updated_at: String!
    tokens: [String!]
  }
  
  type Badges {
    array: [Badge!]!
    tokens: [String!]
  }

  input badgeInput {
    url: String!
    name: String!
    rarity: Int!
    awardedHow: String!
    awardedDesc: String!
    zoom: Int
    championship: String
    isDefault: Boolean
  }

  input updateBadgeInput {
    _id: ID!
    url: String
    name: String
    rarity: Int
    awardedHow: String
    awardedDesc: String
    zoom: Int
  }
`

export default badgeSchema
