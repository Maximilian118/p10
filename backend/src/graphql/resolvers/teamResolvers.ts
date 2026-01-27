import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Team, { teamInputType, teamType } from "../../models/team"
import { capitalise, clientS3, deleteS3 } from "../../shared/utility"
import {
  createdByErrors,
  teamImageErrors,
  teamNameErrors,
  throwError,
  falsyValErrors,
  officialEntityErrors,
} from "./resolverErrors"
import { teamPopulation } from "../../shared/population"
import { syncTeamDrivers, updateDrivers, recalculateTeamSeries } from "./resolverUtility"
import { extractDominantColor } from "../../shared/colorExtraction"

const teamResolvers = {
  newTeam: async (args: { teamInput: teamInputType }, req: AuthRequest): Promise<teamType> => {
    if (!req.isAuth) {
      throwError("newTeam", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { created_by, icon, emblem, name, nationality, inceptionDate, drivers } = args.teamInput
      // Check for errors.
      teamImageErrors(icon, emblem)
      await createdByErrors(req._id, created_by)
      await teamNameErrors(name)

      // Extract dominant color from the emblem image (higher quality than icon).
      const dominantColour = await extractDominantColor(emblem)

      // Create a new team DB object.
      const team = new Team({
        created_by,
        icon,
        emblem,
        dominantColour,
        name,
        stats: {
          nationality,
          inceptionDate,
        },
      })

      // Save the new team to the DB.
      await team.save()

      // If drivers were provided, add this team to each driver and update team's drivers array.
      if (drivers && drivers.length > 0) {
        await updateDrivers(drivers, team._id)
        team.drivers = drivers
        await team.save()
        // Calculate initial team.series based on drivers' series.
        await recalculateTeamSeries(team._id)
      }

      // Return the new team with tokens.
      return {
        ...team._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getTeams: async (
    {},
    req: AuthRequest,
  ): Promise<{
    array: teamType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getTeams", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find all teams.
      const teams = await Team.find().populate(teamPopulation).exec()

      // Return all teams with tokens.
      return {
        array: teams,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  deleteTeam: async ({ _id }: teamType, req: AuthRequest): Promise<teamType> => {
    if (!req.isAuth) {
      throwError("getTeams", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find the team.
      const team = await Team.findById(_id)

      if (!team) {
        throw throwError("teamName", team, "This team doesn't exist... Hmm...")
      }

      // Check if official entity - only admins can delete.
      await officialEntityErrors(team.official, req._id, "teams")

      if (team.drivers.length > 0) {
        throw throwError("teamName", team, "This team still has drivers.")
      }
      // Delete all images from S3.
      const iconErr = await deleteS3(clientS3(), clientS3(team._doc.icon).params, 0)
      if (iconErr) {
        throw throwError("dropzone", team._doc.icon, iconErr)
      }
      const emblemErr = await deleteS3(clientS3(), clientS3(team._doc.emblem).params, 0)
      if (emblemErr) {
        throw throwError("dropzone", team._doc.emblem, emblemErr)
      }
      // Delete team from DB.
      await team.deleteOne()

      // Return deleted team with tokens.
      return {
        ...team._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  updateTeam: async (args: { teamInput: teamInputType }, req: AuthRequest): Promise<teamType> => {
    if (!req.isAuth) {
      throwError("getTeams", req.isAuth, "Not Authenticated!", 401)
    }
    try {
      const { _id, icon, emblem, name, nationality, inceptionDate, drivers } = args.teamInput
      // Check for errors.
      teamImageErrors(icon, emblem)
      falsyValErrors({
        dropzone: icon,
        dropzoneEmblem: emblem,
        teamName: name,
        nationality,
        inceptionDate,
      })

      // Find the team by _id.
      const team = await Team.findById(_id)

      if (!team) {
        throw throwError("teamName", team, "No team by that _id could be found.")
      }

      // Check if official entity - only admins can modify.
      await officialEntityErrors(team.official, req._id, "teams")

      // Update image fields if changed.
      if (icon !== team._doc.icon) {
        team.icon = icon
      }

      if (emblem !== team._doc.emblem) {
        team.emblem = emblem
        // Re-extract dominant color when emblem changes (higher quality than icon).
        team.dominantColour = await extractDominantColor(emblem)
      }

      if (capitalise(team.name) !== capitalise(name)) {
        await teamNameErrors(name) // Have to check if name has been changed before checking for errors.
        team.name = capitalise(name)
      }

      if (team.stats.nationality !== nationality) {
        team.stats.nationality = nationality
      }

      if (team.stats.inceptionDate !== inceptionDate) {
        team.stats.inceptionDate = inceptionDate
      }

      // Sync driver-team relationships if drivers array was provided.
      if (drivers) {
        const oldDriverIds = team.drivers || []
        const newDriverIds = drivers
        await syncTeamDrivers(team._id, oldDriverIds, newDriverIds)
        team.drivers = newDriverIds
        // Recalculate team.series based on new driver composition.
        await recalculateTeamSeries(team._id)
      }

      team.updated_at = moment().format()
      const newteam = await team.save()
      await newteam.populate(teamPopulation)

      // Return updated team with tokens.
      return {
        ...newteam._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getTeamById: async ({ _id }: { _id: string }, req: AuthRequest): Promise<teamType> => {
    if (!req.isAuth) {
      throwError("getTeamById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find the team by _id.
      const team = await Team.findById(_id).populate(teamPopulation).exec()

      if (!team) {
        throw throwError("getTeamById", _id, "Team not found!", 404)
      }

      // Check if team is missing dominantColour (pre-existing team).
      // Extract and update it if missing or set to default.
      if (!team.dominantColour || team.dominantColour === "#1a1a2e") {
        // Use emblem (higher quality) instead of icon for better color accuracy.
        const dominantColour = await extractDominantColor(team.emblem)
        team.dominantColour = dominantColour
        await team.save()
      }

      // Return team with tokens.
      return {
        ...team._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default teamResolvers
