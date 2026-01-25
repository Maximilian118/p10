const userSchema = `
  type Permissions {
    admin: Boolean
    adjudicator: Boolean
    guest: Boolean
  }

  # Embedded badge snapshot stored in user's badges array.
  # Permanent copy of badge data at time of earning.
  # featured: Slot position (1-6) for profile display, or null if not featured.
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
    featured: Int
  }

  # Embedded championship snapshot stored in user's championships array.
  # Updated after each round for active champs, preserved when champ is deleted.
  type UserChampSnapshot {
    _id: ID!
    name: String!
    icon: String!
    season: Int!
    position: Int!
    positionChange: Int
    totalPoints: Int!
    lastPoints: Int!
    roundsCompleted: Int!
    totalRounds: Int!
    competitorCount: Int!
    maxCompetitors: Int!
    discoveredBadges: Int!
    totalBadges: Int!
    deleted: Boolean!
    updated_at: String!
  }

  type User {
    _id: ID!
    refresh_count: Int!
    name: String!
    email: String
    icon: String
    profile_picture: String
    championships: [UserChampSnapshot!]!
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

  # Input for updating user profile fields.
  # All fields optional - only provided fields will be updated.
  input UpdateUserInput {
    name: String
    email: String
    icon: String
    profile_picture: String
  }

  # Result from updateUser mutation.
  # emailChanged indicates if email verification was triggered.
  type UpdateUserResult {
    user: User!
    emailChanged: Boolean!
  }

  # Result from isAdjudicator query.
  type IsAdjudicatorResult {
    isAdjudicator: Boolean!
  }

  # Result from deleteAccount mutation.
  type DeleteAccountResult {
    success: Boolean!
  }
`
export default userSchema
