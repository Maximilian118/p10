import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Series, { seriesInputType, seriesType } from "../../models/series"
import Driver from "../../models/driver"
import { seriesPopulation } from "../../shared/population"
import { capitalise, clientS3, deleteS3 } from "../../shared/utility"
import {
  createdByErrors,
  seriesNameErrors,
  driversErrors,
  falsyValErrors,
  hasChampErrors,
  imageErrors,
  nameCanNumbersErrors,
  throwError,
} from "./resolverErrors"
import {
  updateDrivers,
  syncSeriesDrivers,
  getTeamsForDrivers,
  recalculateMultipleTeamsSeries,
} from "./resolverUtility"

const seriesResolvers = {
  // prettier-ignore
  newSeries: async (args: { seriesInput: seriesType }, req: AuthRequest): Promise<seriesType> => {
    if (!req.isAuth) {
      throwError("newSeries", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { created_by, url, name, drivers } = args.seriesInput

      // Check for errors.
      await createdByErrors(req._id, created_by)
      imageErrors(url)
      nameCanNumbersErrors("seriesName", name)
      driversErrors(drivers)

      // Create a new series DB object.
      const series = new Series({
        created_by,
        url,
        name,
        drivers,
      })
      // Update drivers with the _id of this series.
      await updateDrivers(drivers, undefined, series._id)
      // Save the new series to the DB.
      const newSeries = await series.save()
      await newSeries.populate(seriesPopulation)

      // Recalculate team.series for all teams whose drivers now compete in this series.
      const affectedTeamIds = await getTeamsForDrivers(drivers)
      await recalculateMultipleTeamsSeries(affectedTeamIds)

      // Return the new series with tokens.
      return {
        ...newSeries._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getSeries: async (
    {},
    req: AuthRequest,
  ): Promise<{
    array: seriesType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getSeries", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find all series.
      const seriesList = await Series.find().populate(seriesPopulation).exec()

      // Return the series list with tokens.
      return {
        array: seriesList,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  updateSeries: async (
    args: { seriesInput: seriesInputType },
    req: AuthRequest,
  ): Promise<seriesType> => {
    if (!req.isAuth) {
      throwError("updateSeries", req.isAuth, "Not Authenticated!", 401)
    }
    try {
      const { _id, url, name, drivers } = args.seriesInput
      // Check for errors
      imageErrors(url)
      falsyValErrors({
        dropzone: url,
        seriesName: name,
      })

      // Find the series by _id.
      const series = await Series.findById(_id)

      if (!series) {
        throw throwError("seriesName", series, "No series by that _id could be found.")
      }

      if (url !== series._doc.url) {
        series.url = url
      }

      if (capitalise(series.name) !== capitalise(name)) {
        await seriesNameErrors(name) // Have to check if name has been changed before checking for errors.
        series.name = capitalise(name)
      }

      if (series.drivers !== drivers) {
        // Validate that all new drivers exist.
        await updateDrivers(drivers)
        // Get affected teams before syncing (from both old and new drivers).
        const affectedTeamIds = await getTeamsForDrivers([...series.drivers, ...drivers])
        // Sync series-driver relationship bidirectionally.
        await syncSeriesDrivers(series._id, series.drivers, drivers)
        series.drivers = drivers
        // Recalculate team.series for all affected teams.
        await recalculateMultipleTeamsSeries(affectedTeamIds)
      }

      series.updated_at = moment().format()
      const updatedSeries = await series.save()
      await updatedSeries.populate(seriesPopulation)

      // Return updated series with tokens.
      return {
        ...updatedSeries._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  deleteSeries: async (
    { _id }: seriesType,
    req: AuthRequest,
  ): Promise<seriesType> => {
    if (!req.isAuth) {
      throwError("deleteSeries", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find the series.
      const series = await Series.findById(_id)

      if (!series) {
        throw throwError("seriesName", series, "This series doesn't exist... Hmm...")
      }

      // Check for errors
      hasChampErrors("series", series.championships)

      if (series.drivers.length > 2) {
        throw throwError("drivers", series, "Series has too many drivers.")
      }

      // Get all teams affected by this series deletion.
      const affectedTeamIds = await getTeamsForDrivers(series.drivers)

      // Remove this series from all drivers' series arrays.
      for (const driverId of series.drivers) {
        const driver = await Driver.findById(driverId)
        if (driver) {
          driver.series = driver.series.filter((s) => s.toString() !== series._id.toString())
          driver.updated_at = moment().format()
          await driver.save()
        }
      }

      // Delete the image from s3.
      const deleteErr = await deleteS3(clientS3(), clientS3(series._doc.url).params, 0)
      // If deleteS3 had any errors.
      if (deleteErr) {
        throw throwError("dropzone", series._doc.url, deleteErr)
      }
      // Delete series from DB.
      await series.deleteOne()

      // Recalculate team.series for all affected teams.
      await recalculateMultipleTeamsSeries(affectedTeamIds)

      // Return deleted series with tokens.
      return {
        ...series._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default seriesResolvers
