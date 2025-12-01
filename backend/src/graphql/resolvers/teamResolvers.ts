import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Team, { teamInputType, teamType } from "../../models/team"
import { capitalise, clientS3, deleteS3 } from "../../shared/utility"
import {
  createdByErrors,
  imageErrors,
  teamNameErrors,
  throwError,
  falsyValErrors,
} from "./resolverErrors"
import { teamPopulation } from "../../shared/population"

const teamResolvers = {
  newTeam: async (args: { teamInput: teamInputType }, req: AuthRequest): Promise<teamType> => {
    if (!req.isAuth) {
      throwError("newTeam", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { created_by, url, name, nationality, inceptionDate } = args.teamInput
      // Check for errors.
      imageErrors(url)
      await createdByErrors(req._id, created_by)
      await teamNameErrors(name)

      // Create a new team DB object.
      const team = new Team({
        created_by,
        url,
        name,
        stats: {
          nationality,
          inceptionDate,
        },
      })

      // Save the new user to the DB.
      await team.save()

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

      if (team.drivers.length > 0) {
        throw throwError("teamName", team, "This team still has drivers.")
      }
      // Delete the image from s3.
      const deleteErr = await deleteS3(clientS3(), clientS3(team._doc.url).params, 0)
      // If deleteS3 had any errors.
      if (deleteErr) {
        throw throwError("dropzone", team._doc.url, deleteErr)
      }
      // Delete image from DB.
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
      const { _id, url, name, nationality, inceptionDate } = args.teamInput
      // Check for errors
      imageErrors(url)
      falsyValErrors({
        dropzone: url,
        teamName: name,
        nationality,
        inceptionDate,
      })

      // Find the team by _id.
      const team = await Team.findById(_id)

      if (!team) {
        throw throwError("teamName", team, "No team by that _id could be found.")
      }

      if (url !== team._doc.url) {
        team.url = url
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
}

export default teamResolvers
