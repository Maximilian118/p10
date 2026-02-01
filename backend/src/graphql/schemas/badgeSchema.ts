const badgeSchema = `
  type Badge {
    _id: ID!
    championship: String
    url: String
    name: String
    customName: String
    rarity: Int!
    awardedHow: String
    awardedDesc: String
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
    customName: String
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
    customName: String
    rarity: Int
    awardedHow: String
    awardedDesc: String
    zoom: Int
  }

  type AwardBadgeResult {
    success: Boolean!
    message: String
    badge: Badge
    tokens: [String!]
  }

  type RemoveBadgeResult {
    success: Boolean!
    tokens: [String!]
  }
`

export default badgeSchema
