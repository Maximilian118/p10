import { buildSchema } from "graphql"
import userSchema from "./userSchema"
import bucketSchema from "./bucketSchema"
import champSchema from "./champSchema"
import badgeSchema from "./badgeSchema"
import driverSchema from "./driverSchema"
import seriesSchema from "./seriesSchema"
import teamSchema from "./teamSchema"

const Schema = buildSchema(`
  ${userSchema}
  ${bucketSchema}
  ${champSchema}
  ${badgeSchema}
  ${seriesSchema}
  ${driverSchema}
  ${teamSchema}

  type rootQuery {
    signS3(filename: String!): S3Payload!
    login(email: String!, password: String): User!
    getUserById(_id: ID!): User!
    getBadgesByChamp(championship: String): Badges
    getSeries: SeriesList
    getDrivers: Drivers
    getTeams: Teams
    getTeamById(_id: ID!): Team!
    getChamps: Champs
    getChampById(_id: ID!): Champ!
    getMyTopChampionship: FloatingChamp
  }

  type rootMutation {
    createUser(userInput: userInput): User!
    forgot(email: String!): String!
    updatePP(icon: String!, profile_picture: String!): User!
    updateName(name: String!): User!
    updateEmail(email: String!): String!
    confirmEmailChange(token: String!): User!
    updatePassword(currentPass: String!, password: String!, passConfirm: String!): User!
    setFeaturedBadge(badgeId: ID!, position: Int): User!
    createChamp(champInput: ChampInput): Champ!
    updateChampPP(_id: ID!, icon: String!, profile_picture: String!): Champ!
    updateChampSettings(_id: ID!, settings: ChampSettingsInput!): Champ!
    updateAdminSettings(_id: ID!, settings: AdminSettingsInput!): Champ!
    joinChamp(_id: ID!): Champ!
    updateRoundStatus(_id: ID!, input: UpdateRoundStatusInput!): Champ!
    placeBet(_id: ID!, input: PlaceBetInput!): Champ!
    submitDriverPositions(_id: ID!, input: SubmitDriverPositionsInput!): Champ!
    deleteChamp(_id: ID!, confirmName: String!): DeletedChamp!
    newBadge(badgeInput: badgeInput): Badge!
    updateBadge(updateBadgeInput: updateBadgeInput): Badge!
    deleteBadge(_id: ID!): Badge!
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
  }

  schema {
    query: rootQuery
    mutation: rootMutation
  }
`)

export default Schema
