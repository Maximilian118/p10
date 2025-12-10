import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Driver, { driverInputType, driverType } from "../../models/driver"
import { driverPopulation } from "../../shared/population"
import {
  createdByErrors,
  driverIDErrors,
  driverImageErrors,
  driverInChampErrors,
  driverNameErrors,
  falsyValErrors,
  throwError,
} from "./resolverErrors"
import Series from "../../models/series"
import { updateTeams, syncDriverTeams } from "./resolverUtility"
import { capitalise, clientS3, deleteS3 } from "../../shared/utility"

const driverResolvers = {
  newDriver: async (
    args: { driverInput: driverInputType },
    req: AuthRequest,
  ): Promise<driverType> => {
    if (!req.isAuth) {
      throwError("newDriver", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const {
        created_by,
        icon,
        profile_picture,
        body,
        name,
        driverID,
        teams,
        nationality,
        heightCM,
        weightKG,
        birthday,
        moustache,
        mullet,
      } = args.driverInput

      // Check for errors.
      await createdByErrors(req._id, created_by)
      driverImageErrors(icon, profile_picture, body)
      await driverNameErrors(name)
      driverIDErrors(driverID)
      falsyValErrors({
        ...args.driverInput,
        dropzone: icon,
        driverName: name,
      })

      // Create a new driver DB object.
      const driver = new Driver({
        created_by,
        icon,
        profile_picture,
        body,
        name,
        driverID,
        teams,
        stats: {
          nationality,
          heightCM,
          weightKG,
          birthday,
          moustache,
          mullet,
        },
      })
      // Update teams with the _id of this driver.
      await updateTeams(teams, driver._id)
      // Save the new driver to the DB.
      const newDriver = await driver.save()
      await newDriver.populate(driverPopulation)
      // Return the new driver with tokens.
      return {
        ...newDriver._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getDrivers: async (
    {},
    req: AuthRequest,
  ): Promise<{
    array: driverType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getDrivers", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find all drivers.
      const drivers = await Driver.find().populate(driverPopulation).exec()

      // Return the new user with tokens.
      return {
        array: drivers,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  deleteDriver: async ({ _id }: driverType, req: AuthRequest): Promise<driverType> => {
    if (!req.isAuth) {
      throwError("getTeams", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find the team.
      const driver = await Driver.findById(_id)

      if (!driver) {
        throw throwError("driverName", driver, "This driver doesn't exist... Hmm...")
      }

      if (driver.teams.length > 0) {
        throw throwError("driverName", driver, "This driver still has teams.")
      }

      // Check if driver is part of any championship (via series or bets).
      await driverInChampErrors(driver)

      // Remove driver from any series (allowed since not in championship).
      for (const seriesId of driver.series) {
        const seriesDoc = await Series.findById(seriesId)
        if (seriesDoc) {
          seriesDoc.drivers = seriesDoc.drivers.filter(
            (d) => d.toString() !== driver._id.toString(),
          )
          seriesDoc.updated_at = moment().format()
          await seriesDoc.save()
        }
      }

      // Delete the icon image from s3.
      const deleteIconErr = await deleteS3(clientS3(), clientS3(driver._doc.icon).params, 0)
      if (deleteIconErr) {
        throw throwError("dropzone", driver._doc.icon, deleteIconErr)
      }
      // Delete the profile_picture from s3.
      const deletePPErr = await deleteS3(clientS3(), clientS3(driver._doc.profile_picture).params, 0)
      if (deletePPErr) {
        throw throwError("dropzone", driver._doc.profile_picture, deletePPErr)
      }
      // Delete body image from s3 if it exists.
      if (driver._doc.body) {
        const deleteBodyErr = await deleteS3(clientS3(), clientS3(driver._doc.body).params, 0)
        if (deleteBodyErr) {
          throw throwError("dropzoneBody", driver._doc.body, deleteBodyErr)
        }
      }
      // Delete image from DB.
      await driver.deleteOne()

      // Return deleted driver with tokens.
      return {
        ...driver._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  updateDriver: async (
    args: { driverInput: driverInputType },
    req: AuthRequest,
  ): Promise<driverType> => {
    if (!req.isAuth) {
      throwError("getTeams", req.isAuth, "Not Authenticated!", 401)
    }
    try {
      const {
        _id,
        icon,
        profile_picture,
        body,
        name,
        driverID,
        teams,
        nationality,
        heightCM,
        weightKG,
        birthday,
        moustache,
        mullet,
      } = args.driverInput
      // Check for errors
      driverImageErrors(icon, profile_picture, body)
      driverIDErrors(driverID)
      falsyValErrors({
        ...args.driverInput,
        dropzone: icon,
        driverName: name,
      })

      // Find the driver by _id.
      const driver = await Driver.findById(_id)

      if (!driver) {
        throw throwError("driverName", driver, "No driver by that _id could be found.")
      }

      if (driver.icon !== icon) {
        driver.icon = icon
      }

      if (driver.profile_picture !== profile_picture) {
        driver.profile_picture = profile_picture
      }

      if (driver.body !== body) {
        driver.body = body
      }

      if (capitalise(driver.name) !== capitalise(name)) {
        await driverNameErrors(name) // Have to check if name has been changed before checking for errors.
        driver.name = capitalise(name)
      }

      if (driver.driverID !== driverID) {
        driver.driverID = driverID
      }

      // Sync team documents bidirectionally if teams changed.
      const oldTeamIds = driver.teams.map((t: any) => t._id || t)
      const newTeamIds = teams
      const teamsChanged =
        oldTeamIds.length !== newTeamIds.length ||
        !oldTeamIds.every((id: any) => newTeamIds.some((nid) => nid.toString() === id.toString()))

      if (teamsChanged) {
        await syncDriverTeams(driver._id, oldTeamIds, newTeamIds)
        driver.teams = teams
      }

      if (driver.stats.nationality !== nationality) {
        driver.stats.nationality = nationality
      }

      if (driver.stats.heightCM !== heightCM) {
        driver.stats.heightCM = heightCM
      }

      if (driver.stats.weightKG !== weightKG) {
        driver.stats.weightKG = weightKG
      }

      if (driver.stats.birthday !== birthday) {
        driver.stats.birthday = birthday
      }

      if (driver.stats.moustache !== moustache) {
        driver.stats.moustache = moustache
      }

      if (driver.stats.mullet !== mullet) {
        driver.stats.mullet = mullet
      }

      driver.updated_at = moment().format()
      const newDriver = await driver.save()
      await newDriver.populate(driverPopulation)

      // Return updated driver with tokens.
      return {
        ...newDriver._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default driverResolvers
