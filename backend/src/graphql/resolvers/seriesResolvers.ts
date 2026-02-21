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
  seriesImageErrors,
  nameCanNumbersErrors,
  officialEntityErrors,
  entityPermissionErrors,
  throwError,
} from "./resolverErrors"
import {
  updateDrivers,
  syncSeriesDrivers,
  getTeamsForDrivers,
  recalculateMultipleTeamsSeries,
  createEmptyRound,
} from "./resolverUtility"
import Champ from "../../models/champ"

const seriesResolvers = {
  // prettier-ignore
  newSeries: async (args: { seriesInput: seriesType }, req: AuthRequest): Promise<seriesType> => {
    if (!req.isAuth) {
      throwError("newSeries", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { created_by, icon, profile_picture, name, shortName, rounds, drivers } = args.seriesInput

      // Check for errors.
      await createdByErrors(req._id, created_by)
      seriesImageErrors(icon, profile_picture)
      nameCanNumbersErrors("seriesName", name)
      driversErrors(drivers)

      // Validate rounds if provided.
      if (rounds !== undefined && rounds !== null && (rounds < 1 || rounds > 100)) {
        throwError("rounds", rounds, "Rounds must be between 1 and 100.")
      }

      // Create a new series DB object.
      const series = new Series({
        created_by,
        icon,
        profile_picture,
        name,
        shortName,
        rounds: rounds ?? null,
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
  // Get a single series by ID.
  getSeriesById: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<seriesType> => {
    if (!req.isAuth) {
      throwError("getSeriesById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const series = await Series.findById(_id).populate(seriesPopulation).exec()

      if (!series) {
        throw throwError("seriesName", _id, "No series by that _id could be found.")
      }

      return {
        ...series._doc,
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
      const { _id, icon, profile_picture, name, shortName, rounds, drivers } = args.seriesInput
      // Check for errors.
      falsyValErrors({
        seriesName: name,
      })

      // Find the series by _id.
      const series = await Series.findById(_id)

      if (!series) {
        throw throwError("seriesName", series, "No series by that _id could be found.")
      }

      // Only validate images if new ones were provided.
      if (icon || profile_picture) {
        seriesImageErrors(icon || series._doc.icon, profile_picture || series._doc.profile_picture)
      }

      // Check if official entity - only admins can modify.
      await officialEntityErrors(series.official, req._id, "series")

      // Check usage-scoped adjudicator permissions.
      await entityPermissionErrors(series, req._id, "series")

      if (icon && icon !== series._doc.icon) {
        series.icon = icon
      }

      if (profile_picture && profile_picture !== series._doc.profile_picture) {
        series.profile_picture = profile_picture
      }

      if (capitalise(series.name) !== capitalise(name)) {
        await seriesNameErrors(name) // Have to check if name has been changed before checking for errors.
        series.name = capitalise(name)
      }

      // Update shortName if provided and different.
      if (shortName !== undefined && series.shortName !== shortName) {
        series.shortName = shortName
      }

      // Update rounds if the value has changed. Propagate to all championships using this series.
      if (rounds !== undefined) {
        const newRounds = rounds === null ? null : rounds
        if (newRounds !== null && (newRounds < 1 || newRounds > 100)) {
          throwError("rounds", newRounds, "Rounds must be between 1 and 100.")
        }

        const oldRounds = series.rounds ?? null
        if (newRounds !== oldRounds) {
          series.rounds = newRounds

          // Propagate round count change to all championships in this series.
          if (newRounds !== null) {
            const champs = await Champ.find({ series: series._id })
            for (const champ of champs) {
              const currentCount = champ.rounds.length
              if (newRounds > currentCount) {
                // Add new waiting rounds.
                for (let i = currentCount + 1; i <= newRounds; i++) {
                  champ.rounds.push(createEmptyRound(i))
                }
              } else if (newRounds < currentCount) {
                // Only remove trailing waiting rounds. Find how many we can safely remove.
                const nonWaitingCount = champ.rounds.filter(r => r.status !== "waiting").length
                const safeMin = nonWaitingCount + 1
                const targetCount = Math.max(newRounds, safeMin)
                if (targetCount < currentCount) {
                  champ.rounds = champ.rounds.slice(0, targetCount)
                }
              }
              champ.markModified("rounds")
              champ.updated_at = moment().format()
              await champ.save()
            }
          }
        }
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

      // Check if official entity - only admins can delete.
      await officialEntityErrors(series.official, req._id, "series")

      // Check usage-scoped adjudicator permissions.
      await entityPermissionErrors(series, req._id, "series")

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

      // Delete both images from S3.
      const iconDeleteErr = await deleteS3(clientS3(), clientS3(series._doc.icon).params, 0)
      if (iconDeleteErr) {
        throw throwError("dropzone", series._doc.icon, iconDeleteErr)
      }
      const ppDeleteErr = await deleteS3(clientS3(), clientS3(series._doc.profile_picture).params, 0)
      if (ppDeleteErr) {
        throw throwError("dropzone", series._doc.profile_picture, ppDeleteErr)
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
