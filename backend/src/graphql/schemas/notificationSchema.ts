const notificationSchema = `
  # Badge snapshot embedded in notification for badge_earned type.
  type NotificationBadgeSnapshot {
    _id: ID!
    championship: ID!
    url: String!
    name: String!
    customName: String
    rarity: Int!
    awardedHow: String!
    awardedDesc: String!
    zoom: Int!
    awarded_at: String!
    featured: Int
  }

  # Notification object stored in user's notifications array.
  type Notification {
    _id: ID!
    type: String!
    title: String!
    description: String!
    read: Boolean!
    champId: ID
    champName: String
    champIcon: String
    badgeSnapshot: NotificationBadgeSnapshot
    # Protest notification fields.
    protestId: ID
    protestTitle: String
    filerId: ID
    filerName: String
    filerIcon: String
    accusedId: ID
    accusedName: String
    accusedIcon: String
    filerPoints: Int
    accusedPoints: Int
    protestStatus: String
    createdAt: String!
  }

  # User's email notification preferences.
  type NotificationSettings {
    emailChampInvite: Boolean!
    emailBadgeEarned: Boolean!
    emailRoundStarted: Boolean!
    emailResultsPosted: Boolean!
    emailKicked: Boolean!
    emailBanned: Boolean!
    emailPromoted: Boolean!
    emailUserJoined: Boolean!
    emailProtestFiled: Boolean!
    emailProtestVoteRequired: Boolean!
    emailProtestPassed: Boolean!
    emailProtestDenied: Boolean!
    emailProtestExpired: Boolean!
  }

  # Wrapper type for getNotifications query (includes tokens for refresh).
  type NotificationsResult {
    notifications: [Notification!]!
    tokens: [String!]
  }

  # Input for updating notification settings.
  input NotificationSettingsInput {
    emailChampInvite: Boolean
    emailBadgeEarned: Boolean
    emailRoundStarted: Boolean
    emailResultsPosted: Boolean
    emailKicked: Boolean
    emailBanned: Boolean
    emailPromoted: Boolean
    emailUserJoined: Boolean
    emailProtestFiled: Boolean
    emailProtestVoteRequired: Boolean
    emailProtestPassed: Boolean
    emailProtestDenied: Boolean
    emailProtestExpired: Boolean
  }
`

export default notificationSchema
