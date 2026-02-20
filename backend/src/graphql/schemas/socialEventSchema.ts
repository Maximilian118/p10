// GraphQL type definitions for social events, comments, and related features.
const socialEventSchema = `
  # Denormalized user snapshot for fast feed rendering.
  type UserSnapshot {
    name: String!
    icon: String!
  }

  # Flexible payload for social events - varies by event kind.
  type SocialEventPayload {
    badgeName: String
    badgeUrl: String
    badgeRarity: Int
    badgeAwardedHow: String
    champId: ID
    champName: String
    champIcon: String
    season: Int
    roundNumber: Int
    driverName: String
    pointsEarned: Int
    streakCount: Int
    milestoneValue: Int
    milestoneLabel: String
  }

  # A social event displayed in the home feed.
  type SocialEvent {
    _id: ID!
    kind: String!
    user: ID!
    userSnapshot: UserSnapshot!
    payload: SocialEventPayload!
    commentCount: Int!
    created_at: String!
  }

  # Paginated feed response with cursor-based pagination.
  type SocialEventFeed {
    events: [SocialEvent!]!
    nextCursor: String
    tokens: [String!]
  }

  # A comment on a social event.
  type SocialComment {
    _id: ID!
    event: ID!
    user: ID!
    userSnapshot: UserSnapshot!
    text: String!
    likes: [ID!]!
    dislikes: [ID!]!
    likesCount: Int!
    dislikesCount: Int!
    created_at: String!
  }

  # Paginated comments response.
  type SocialComments {
    comments: [SocialComment!]!
    nextCursor: String
    tokens: [String!]
  }

  # User's social event privacy preferences.
  type SocialEventSettings {
    badge_earned_epic: Boolean!
    badge_earned_legendary: Boolean!
    badge_earned_mythic: Boolean!
    champ_joined: Boolean!
    champ_created: Boolean!
    season_won: Boolean!
    season_runner_up: Boolean!
    round_won: Boolean!
    round_perfect_bet: Boolean!
    win_streak: Boolean!
    points_milestone: Boolean!
    rounds_milestone: Boolean!
    user_joined_platform: Boolean!
    adjudicator_promoted: Boolean!
  }

  # Input for updating social event settings (all optional - only send changed fields).
  input SocialEventSettingsInput {
    badge_earned_epic: Boolean
    badge_earned_legendary: Boolean
    badge_earned_mythic: Boolean
    champ_joined: Boolean
    champ_created: Boolean
    season_won: Boolean
    season_runner_up: Boolean
    round_won: Boolean
    round_perfect_bet: Boolean
    win_streak: Boolean
    points_milestone: Boolean
    rounds_milestone: Boolean
    user_joined_platform: Boolean
    adjudicator_promoted: Boolean
  }

  # User location for geo-based feed ranking.
  type UserLocation {
    city: String
    region: String
    country: String
    coordinates: Coordinates
  }

  type Coordinates {
    lat: Float
    lng: Float
  }

  # Input for updating user location.
  input LocationInput {
    city: String
    region: String
    country: String
    lat: Float
    lng: Float
  }

  # Lightweight championship snapshot for following detail view.
  type ChampSnapshot {
    _id: ID!
    name: String!
    icon: String!
    updated_at: String
  }

  # A followed user with championship and location data for sorted display.
  type FollowingDetailedUser {
    _id: ID!
    name: String!
    icon: String!
    championships: [ChampSnapshot!]!
    location: UserLocation
  }

  # Response for getFollowingDetailed query.
  type FollowingDetailed {
    users: [FollowingDetailedUser!]!
    tokens: [String!]
  }
`

export default socialEventSchema
