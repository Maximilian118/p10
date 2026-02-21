import { buildSchema } from "graphql"
import userSchema from "./userSchema"
import bucketSchema from "./bucketSchema"
import champSchema from "./champSchema"
import badgeSchema from "./badgeSchema"
import driverSchema from "./driverSchema"
import seriesSchema from "./seriesSchema"
import teamSchema from "./teamSchema"
import notificationSchema from "./notificationSchema"
import trackmapSchema from "./trackmapSchema"
import demoSchema from "./demoSchema"
import socialEventSchema from "./socialEventSchema"

const Schema = buildSchema(`
  scalar JSON

  ${userSchema}
  ${bucketSchema}
  ${champSchema}
  ${badgeSchema}
  ${seriesSchema}
  ${driverSchema}
  ${teamSchema}
  ${notificationSchema}
  ${trackmapSchema}
  ${demoSchema}
  ${socialEventSchema}

  type rootQuery {
    signS3(filename: String!): S3Payload!
    login(email: String!, password: String): User!
    getUserById(_id: ID!): User!
    getUsers(limit: Int): Users
    getBadgesByChamp(championship: String): Badges
    getSeries: SeriesList
    getSeriesById(_id: ID!): Series!
    getDrivers: Drivers
    getTeams: Teams
    getTeamById(_id: ID!): Team!
    getChamps: Champs
    getChampById(_id: ID!): Champ!
    getMyTopChampionship: FloatingChamp
    isAdjudicator: IsAdjudicatorResult!
    getNotifications: NotificationsResult!
    getProtest(protestId: ID!): Protest!
    getProtestsForChampionship(champId: ID!): Protests!
    getTrackmap(trackName: String): Trackmap
    getFeed(cursor: String, limit: Int): SocialEventFeed!
    getComments(eventId: ID!, cursor: String, limit: Int): SocialComments!
    getTopComment(eventId: ID!): TopCommentResult!
    getFollowing(userId: ID): Users!
    getFollowingDetailed(userId: ID!): FollowingDetailed!
  }

  type rootMutation {
    createUser(userInput: userInput): User!
    forgot(email: String!): String!
    updatePP(icon: String!, profile_picture: String!): User!
    updateUser(input: UpdateUserInput!): UpdateUserResult!
    updateEmail(email: String!): String!
    confirmEmailChange(token: String!): User!
    updatePassword(currentPass: String!, password: String!, passConfirm: String!): User!
    setFeaturedBadge(badgeId: ID!, position: Int): User!
    deleteAccount: DeleteAccountResult!
    createChamp(champInput: ChampInput): Champ!
    updateChampPP(_id: ID!, icon: String!, profile_picture: String!): Champ!
    updateChampSettings(_id: ID!, settings: ChampSettingsInput!): Champ!
    updateAdminSettings(_id: ID!, settings: AdminSettingsInput!): Champ!
    joinChamp(_id: ID!): Champ!
    inviteUser(_id: ID!, userId: ID!): Champ!
    banCompetitor(_id: ID!, competitorId: ID!): Champ!
    unbanCompetitor(_id: ID!, competitorId: ID!): Champ!
    kickCompetitor(_id: ID!, competitorId: ID!): Champ!
    leaveChampionship(_id: ID!): Champ!
    promoteAdjudicator(_id: ID!, newAdjudicatorId: ID!): Champ!
    adjustCompetitorPoints(_id: ID!, competitorId: ID!, change: Int!): AdjustmentResult!
    updateRoundStatus(_id: ID!, input: UpdateRoundStatusInput!): Champ!
    placeBet(_id: ID!, input: PlaceBetInput!): Champ!
    submitDriverPositions(_id: ID!, input: SubmitDriverPositionsInput!): Champ!
    addRule(_id: ID!, input: AddRuleInput!): RulesAndRegsResponse!
    updateRule(_id: ID!, input: UpdateRuleInput!): RulesAndRegsResponse!
    deleteRule(_id: ID!, ruleIndex: Int!): RulesAndRegsResponse!
    addSubsection(_id: ID!, input: AddSubsectionInput!): Champ!
    updateSubsection(_id: ID!, input: UpdateSubsectionInput!): Champ!
    deleteSubsection(_id: ID!, input: DeleteSubsectionInput!): Champ!
    deleteChamp(_id: ID!, confirmName: String!): DeletedChamp!
    newBadge(badgeInput: badgeInput): Badge!
    updateBadge(updateBadgeInput: updateBadgeInput): Badge!
    deleteBadge(_id: ID!): Badge!
    awardBadge(userId: ID!, champId: ID!, awardedHow: String!): AwardBadgeResult!
    removeChampBadge(champId: ID!, badgeId: ID!): RemoveBadgeResult!
    newSeries(seriesInput: seriesInput): Series!
    updateSeries(seriesInput: seriesInput): Series!
    deleteSeries(_id: ID!): Series!
    newDriver(driverInput: driverInput): Driver!
    updateDriver(driverInput: driverInput): Driver!
    deleteDriver(_id: ID!): Driver!
    newTeam(teamInput: teamInput): Team!
    updateTeam(teamInput: teamInput): Team!
    deleteTeam(_id: ID!): Team!
    deleteS3(url: String!, depth: Int): S3Deleted!
    markNotificationRead(_id: ID!): User!
    clearNotification(_id: ID!): User!
    clearAllNotifications: User!
    updateNotificationSettings(settings: NotificationSettingsInput!): User!
    createProtest(input: CreateProtestInput!): Protest!
    voteOnProtest(protestId: ID!, vote: Boolean!): Protest!
    moveProtestToVoting(protestId: ID!): Protest!
    determineProtest(protestId: ID!, status: ProtestStatus!): Protest!
    allocateProtestPoints(input: AllocateProtestPointsInput!): Protest!
    startDemo(sessionKey: Int, speed: Int): DemoStatus!
    stopDemo: DemoStatus!
    setTrackmapRotation(trackName: String!, rotation: Float!): Boolean!
    followUser(userId: ID!): User!
    unfollowUser(userId: ID!): User!
    addComment(eventId: ID!, text: String!): SocialComment!
    toggleCommentLike(commentId: ID!): SocialComment!
    toggleCommentDislike(commentId: ID!): SocialComment!
    updateSocialEventSettings(settings: SocialEventSettingsInput!): User!
    updateLocation(location: LocationInput!): User!
  }

  schema {
    query: rootQuery
    mutation: rootMutation
  }
`)

export default Schema
