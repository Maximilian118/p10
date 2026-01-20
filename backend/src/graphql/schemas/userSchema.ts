const userSchema = `
  type Permissions {
    admin: Boolean
    adjudicator: Boolean
    guest: Boolean
  }

  # Embedded badge snapshot stored in user's badges array.
  # Permanent copy of badge data at time of earning.
  type UserBadgeSnapshot {
    _id: ID!
    url: String
    name: String
    customName: String
    rarity: Int!
    awardedHow: String
    awardedDesc: String
    zoom: Int!
    championship: ID!
    awarded_at: String!
  }

  type User {
    _id: ID!
    refresh_count: Int!
    name: String!
    email: String
    icon: String
    profile_picture: String
    championships: [Champ]!
    badges: [UserBadgeSnapshot!]!
    permissions: Permissions!
    logged_in_at: String!
    created_at: String!
    updated_at: String!
    password: String
    tokens: [String!]
  }

  input userInput {
    name: String!
    email: String!
    password: String!
    passConfirm: String!
    icon: String!
    profile_picture: String!
  }
`
export default userSchema
