import { ObjectId } from "mongodb"
import Team, { teamType } from "../../models/team"
import { throwError } from "./resolverErrors"
import Driver, { driverType } from "../../models/driver"
import moment from "moment"
// Loop through an array of Team ID's and ensure they all exist in the DB.
// Returning an array of found teams.
export const updateTeams = async (teams: ObjectId[], driver_id?: ObjectId): Promise<teamType[]> => {
  const type = "teams"
  const foundTeams: teamType[] = []

  for (const _id of teams) {
    const team = await Team.findById(_id)

    if (!team) {
      throw throwError(type, _id, "One of the selected teams doesn't exist.")
    }

    if (driver_id) {
      team.drivers.push(driver_id)
      team.updated_at = moment().format()
      await team.save()
    }

    foundTeams.push(team)
  }

  return foundTeams
}
// Loop through an array of Team ID's and ensure they all exist in the DB.
// Returning an array of found drivers.
export const updateDrivers = async (
  drivers: ObjectId[],
  team_id?: ObjectId,
  champ_id?: ObjectId,
): Promise<driverType[]> => {
  const type = "drivers"
  const foundDrivers: driverType[] = []

  for (const _id of drivers) {
    const driver = await Driver.findById(_id)

    if (!driver) {
      throw throwError(type, _id, "One of the selected drivers doesn't exist.")
    }

    if (team_id || champ_id) {
      team_id && driver.teams.push(team_id)
      champ_id && driver.driverGroups.push(champ_id)
      driver.updated_at = moment().format()
      await driver.save()
    }

    foundDrivers.push(driver)
  }

  return foundDrivers
}

// Sync driver-team relationship bidirectionally when teams change.
// Removes driver from old teams and adds to new teams.
export const syncDriverTeams = async (
  driverId: ObjectId,
  oldTeamIds: ObjectId[],
  newTeamIds: ObjectId[],
): Promise<void> => {
  const oldSet = new Set(oldTeamIds.map((id) => id.toString()))
  const newSet = new Set(newTeamIds.map((id) => id.toString()))

  // Find teams to remove driver from (in old but not in new).
  const teamsToRemoveFrom = oldTeamIds.filter((id) => !newSet.has(id.toString()))

  // Find teams to add driver to (in new but not in old).
  const teamsToAddTo = newTeamIds.filter((id) => !oldSet.has(id.toString()))

  // Remove driver from old teams.
  for (const teamId of teamsToRemoveFrom) {
    const team = await Team.findById(teamId)
    if (team) {
      team.drivers = team.drivers.filter((d) => d.toString() !== driverId.toString())
      team.updated_at = moment().format()
      await team.save()
    }
  }

  // Add driver to new teams.
  for (const teamId of teamsToAddTo) {
    const team = await Team.findById(teamId)
    if (team) {
      if (!team.drivers.some((d) => d.toString() === driverId.toString())) {
        team.drivers.push(driverId)
        team.updated_at = moment().format()
        await team.save()
      }
    }
  }
}
