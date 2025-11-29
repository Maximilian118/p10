import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Driver, { driverInputType, driverType } from "../../models/driver"
import { driverPopulation } from "../../shared/population"
import {
  createdByErrors,
  driverIDErrors,
  driverNameErrors,
  falsyValErrors,
  imageErrors,
  throwError,
} from "./resolverErrors"
import { updateTeams } from "./resolverUtility"
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
        url,
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
      imageErrors(url)
      await driverNameErrors(name)
      driverIDErrors(driverID)
      falsyValErrors({
        ...args.driverInput,
        dropzone: url,
        driverName: name,
      })

      // Create a new driver DB object.
      const driver = new Driver(
        {
          created_by,
          url,
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
        },
        (err: string) => {
          if (err) throw new Error(err)
        },
      )
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
        throw throwError("driverName", driver, "This driver still has drivers.")
      }
      // Delete the image from s3.
      const deleteErr = await deleteS3(clientS3(), clientS3(driver._doc.url).params, 0)
      // If deleteS3 had any errors.
      if (deleteErr) {
        throw throwError("dropzone", driver._doc.url, deleteErr)
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
        url,
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
      imageErrors(url)
      driverIDErrors(driverID)
      falsyValErrors({
        ...args.driverInput,
        dropzone: url,
        driverName: name,
      })

      // Find the driver by _id.
      const driver = await Driver.findById(_id)

      if (!driver) {
        throw throwError("driverName", driver, "No driver by that _id could be found.")
      }

      if (driver.url !== url) {
        driver.url = url
      }

      if (capitalise(driver.name) !== capitalise(name)) {
        await driverNameErrors(name) // Have to check if name has been changed before checking for errors.
        driver.name = capitalise(name)
      }

      if (driver.driverID !== driverID) {
        driver.driverID = driverID
      }

      if (driver.teams !== teams) {
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
