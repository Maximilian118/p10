import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import DriverGroup, { driverGroupInputType, driverGroupType } from "../../models/driverGroup"
import { driverGroupPopulation } from "../../shared/population"
import { capitalise, clientS3, deleteS3 } from "../../shared/utility"
import {
  createdByErrors,
  driverGroupNameErrors,
  driversErrors,
  falsyValErrors,
  hasChampErrors,
  imageErrors,
  nameCanNumbersErrors,
  throwError,
} from "./resolverErrors"
import { updateDrivers } from "./resolverUtility"

const driverGroupResolvers = {
  // prettier-ignore
  newDriverGroup: async (args: { driverGroupInput: driverGroupType }, req: AuthRequest): Promise<driverGroupType> => {
    if (!req.isAuth) {
      throwError("newDriverGroup", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { created_by, url, name, drivers } = args.driverGroupInput

      // Check for errors.
      await createdByErrors(req._id, created_by)
      imageErrors(url)
      nameCanNumbersErrors("groupName", name)
      driversErrors(drivers)

      // Create a new driver group DB object.
      const driverGroup = new DriverGroup({
        created_by,
        url,
        name,
        drivers,
      })
      // Update drivers with the _id of this group.
      await updateDrivers(drivers, undefined, driverGroup._id)
      // Save the new driver group to the DB.
      const newGroup = await driverGroup.save()
      await newGroup.populate(driverGroupPopulation)

      // Return the new driver group with tokens.
      return {
        ...newGroup._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getDriverGroups: async (
    {},
    req: AuthRequest,
  ): Promise<{
    array: driverGroupType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getDriverGroups", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find all driverGroups.
      const driverGroups = await DriverGroup.find().populate(driverGroupPopulation).exec()

      // Return the new user with tokens.
      return {
        array: driverGroups,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  updateDriverGroup: async (
    args: { driverGroupInput: driverGroupInputType },
    req: AuthRequest,
  ): Promise<driverGroupType> => {
    if (!req.isAuth) {
      throwError("updateDriverGroup", req.isAuth, "Not Authenticated!", 401)
    }
    try {
      const { _id, url, name, drivers } = args.driverGroupInput
      // Check for errors
      imageErrors(url)
      falsyValErrors({
        dropzone: url,
        groupName: name,
      })

      // Find the driver group by _id.
      const group = await DriverGroup.findById(_id)

      if (!group) {
        throw throwError("groupName", group, "No driver group by that _id could be found.")
      }

      if (url !== group._doc.url) {
        group.url = url
      }

      if (capitalise(group.name) !== capitalise(name)) {
        await driverGroupNameErrors(name) // Have to check if name has been changed before checking for errors.
        group.name = capitalise(name)
      }

      if (group.drivers !== drivers) {
        await updateDrivers(drivers) // Not passing team_id or champ_id meaning we're just checking if each of the drivers in the new drivers array actually exist.
        group.drivers = drivers
      }

      group.updated_at = moment().format()
      const newGroup = await group.save()
      await newGroup.populate(driverGroupPopulation)

      // Return updated team with tokens.
      return {
        ...newGroup._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  deleteDriverGroup: async (
    { _id }: driverGroupType,
    req: AuthRequest,
  ): Promise<driverGroupType> => {
    if (!req.isAuth) {
      throwError("deleteDriverGroup", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find the driver group.
      const driverGroup = await DriverGroup.findById(_id)

      if (!driverGroup) {
        throw throwError("groupName", driverGroup, "This driver group doesn't exist... Hmm...")
      }

      // Check for errors
      hasChampErrors("driverGroup", driverGroup.championships)

      if (driverGroup.drivers.length > 2) {
        throw throwError("drivers", driverGroup, "Driver group has too many drivers.")
      }

      // Delete the image from s3.
      const deleteErr = await deleteS3(clientS3(), clientS3(driverGroup._doc.url).params, 0)
      // If deleteS3 had any errors.
      if (deleteErr) {
        throw throwError("dropzone", driverGroup._doc.url, deleteErr)
      }
      // Delete image from DB.
      await driverGroup.deleteOne()

      // Return deleted driver with tokens.
      return {
        ...driverGroup._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default driverGroupResolvers
