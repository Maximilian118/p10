import { Server } from "socket.io"
import moment from "moment"
import Champ from "../../models/champ"
import Driver from "../../models/driver"
import Series from "../../models/series"
import F1Session from "../../models/f1Session"
import { resultsHandler, archiveSeason } from "../../graphql/resolvers/resolverUtility"
import { broadcastRoundStatusChange } from "../../socket/socketHandler"
import { scheduleResultsTransition } from "../../socket/autoTransitions"
import { champPopulation } from "../../shared/population"
import { refreshNextQualifyingForChamp } from "./qualifyingSchedule"
import { createLogger } from "../../shared/logger"

const log = createLogger("AutoResults")

// Number of championships to process concurrently.
const BATCH_SIZE = 10

// Triggers automatic round results for all API-enabled championships
// when an F1 session finishes. Maps F1Session driver positions to round
// drivers, sets positionActual, runs resultsHandler, and broadcasts
// the transition to ResultsView.
export const triggerAutoResults = async (sessionKey: number, io: Server): Promise<void> => {
  try {
    // Load the finalized F1Session from MongoDB.
    const f1Session = await F1Session.findOne({ sessionKey, status: "finished" })
    if (!f1Session) {
      log.warn(`No finished F1Session found for sessionKey ${sessionKey}`)
      return
    }

    if (f1Session.drivers.length === 0) {
      log.warn(`F1Session ${sessionKey} has no driver data — skipping auto-results`)
      return
    }

    // Find all active championships with an API-enabled series.
    const apiSeries = await Series.find({ hasAPI: true })
    if (apiSeries.length === 0) {
      log.info("No API-enabled series found — skipping auto-results")
      return
    }
    const apiSeriesIds = apiSeries.map((s) => s._id)

    const champs = await Champ.find({
      active: true,
      series: { $in: apiSeriesIds },
    })

    if (champs.length === 0) {
      log.info("No active API-enabled championships found — skipping auto-results")
      return
    }

    // Build a mapping from nameAcronym to DB Driver._id.
    const acronyms = f1Session.drivers.map((d) => d.nameAcronym)
    const dbDrivers = await Driver.find({ driverID: { $in: acronyms } })
    const acronymToDbId = new Map<string, string>(
      dbDrivers.map((d) => [d.driverID, d._id.toString()])
    )

    log.info(`Mapped ${acronymToDbId.size}/${acronyms.length} F1Session drivers to DB drivers`)

    // Build position map: DB driver _id string → positionActual.
    const positionMap = new Map<string, number>()
    for (const f1Driver of f1Session.drivers) {
      const dbId = acronymToDbId.get(f1Driver.nameAcronym)
      if (!dbId) continue

      // DNF/DNS/DSQ drivers get positionActual = 0.
      if (f1Driver.driverStatus === "dnf" || f1Driver.driverStatus === "dns" || f1Driver.driverStatus === "dsq") {
        positionMap.set(dbId, 0)
      } else if (f1Driver.finalPosition !== null && f1Driver.finalPosition > 0) {
        positionMap.set(dbId, f1Driver.finalPosition)
      }
    }

    log.info(`Position map built: ${positionMap.size} drivers with positions`)

    // Process championships in parallel batches (each champ is independent).
    log.info(`Processing ${champs.length} championships in batches of ${BATCH_SIZE}`)
    for (let i = 0; i < champs.length; i += BATCH_SIZE) {
      const batch = champs.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((champ) => processChampionship(champ, positionMap, io)),
      )
      // Log any failures in the batch.
      results.forEach((result, idx) => {
        if (result.status === "rejected") {
          log.error(`Failed to process championship "${batch[idx].name}":`, result.reason)
        }
      })
    }
  } catch (err) {
    log.error("Failed to trigger auto-results:", err)
  }
}

// Processes a single championship: finds the betting_closed round,
// maps positions, runs resultsHandler, and broadcasts the transition.
const processChampionship = async (
  champ: InstanceType<typeof Champ>,
  positionMap: Map<string, number>,
  io: Server,
): Promise<void> => {
  const champId = champ._id.toString()

  // Find the current round in betting_closed status.
  const roundIndex = champ.rounds.findIndex((r) => r.status === "betting_closed")
  if (roundIndex === -1) {
    log.verbose(`Championship "${champ.name}" has no round in betting_closed — skipping`)
    return
  }

  const round = champ.rounds[roundIndex]

  // Guard against double execution.
  if (round.resultsProcessed) {
    log.warn(`Championship "${champ.name}" round ${roundIndex + 1} already processed — skipping`)
    return
  }

  // Map F1Session positions to round drivers.
  let allMapped = true
  for (const driverEntry of round.drivers) {
    const driverId = driverEntry.driver.toString()
    const position = positionMap.get(driverId)
    if (position === undefined) {
      log.warn(`Driver ${driverId} in "${champ.name}" round ${roundIndex + 1} has no mapped position`)
      allMapped = false
    }
  }

  // Only proceed if all round drivers have a mapped position.
  if (!allMapped) {
    log.warn(`Not all drivers mapped for "${champ.name}" round ${roundIndex + 1} — adjudicator must submit manually`)
    return
  }

  // Set positionActual on drivers and randomisedDrivers.
  for (const driverEntry of round.drivers) {
    const driverId = driverEntry.driver.toString()
    driverEntry.positionActual = positionMap.get(driverId) ?? 0
  }
  for (const driverEntry of round.randomisedDrivers) {
    const driverId = driverEntry.driver.toString()
    driverEntry.positionActual = positionMap.get(driverId) ?? 0
  }

  // Transition round to results status.
  round.status = "results"
  round.statusChangedAt = moment().format()
  champ.updated_at = moment().format()
  champ.markModified("rounds")
  await champ.save()

  // Determine if this is the last round BEFORE archival changes the rounds array.
  const isLastRound = roundIndex === champ.rounds.length - 1

  log.info(`✓ Auto-set positionActual for "${champ.name}" round ${roundIndex + 1} — running resultsHandler`)

  // Run the existing 7-step results pipeline.
  await resultsHandler(champId, roundIndex)

  // Archive season if this is the last round.
  if (isLastRound) {
    await archiveSeason(champId)
  }

  // Re-fetch with population so the broadcast includes calculated results data.
  const populatedChamp = await Champ.findById(champId).populate(champPopulation).exec()
  if (populatedChamp) {
    // After archival, the old round index may point to a new season's round.
    const populatedRound = populatedChamp.rounds[roundIndex] || populatedChamp.rounds[0]
    const seasonEndInfo = isLastRound
      ? { isSeasonEnd: true, seasonEndedAt: populatedChamp.seasonEndedAt || moment().format() }
      : undefined

    broadcastRoundStatusChange(io, champId, roundIndex, "results", {
      drivers: populatedRound.drivers,
      competitors: populatedRound.competitors,
      teams: populatedRound.teams,
    }, seasonEndInfo)
  }

  // Only schedule auto-transition to completed for non-final rounds.
  if (!isLastRound) {
    scheduleResultsTransition(io, champId, roundIndex)
  }

  // Refresh the next qualifying session timestamp for the next round.
  await refreshNextQualifyingForChamp(champId)

  log.info(`✓ Auto-results complete for "${champ.name}" round ${roundIndex + 1}${isLastRound ? " (season end)" : ""}`)
}
