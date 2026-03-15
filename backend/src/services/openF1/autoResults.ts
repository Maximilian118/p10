import { Server } from "socket.io"
import axios from "axios"
import moment from "moment"
import Champ, { RoundStatus } from "../../models/champ"
import Driver from "../../models/driver"
import Series from "../../models/series"
import F1Session from "../../models/f1Session"
import { resultsHandler, archiveSeason } from "../../graphql/resolvers/resolverUtility"
import { broadcastRoundStatusChange } from "../../socket/socketHandler"
import { scheduleResultsTransition } from "../../socket/autoTransitions"
import { champPopulation } from "../../shared/population"
import { refreshNextQualifyingForChamp } from "./qualifyingSchedule"
import { getOpenF1Token } from "./auth"
import { OpenF1DriverMsg, OpenF1PositionMsg } from "./types"
import { createLogger } from "../../shared/logger"

const log = createLogger("AutoResults")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// Number of championships to process concurrently.
const BATCH_SIZE = 10

// Builds a position map from a finished F1Session document.
// Maps DB Driver._id strings to their positionActual values.
// DNF/DNS/DSQ drivers get positionActual = 0.
export const buildPositionMap = async (
  f1Session: InstanceType<typeof F1Session>,
): Promise<Map<string, number>> => {
  const acronyms = f1Session.drivers.map((d) => d.nameAcronym)
  const dbDrivers = await Driver.find({ driverID: { $in: acronyms } })
  const acronymToDbId = new Map<string, string>(
    dbDrivers.map((d) => [d.driverID, d._id.toString()]),
  )

  log.info(`Mapped ${acronymToDbId.size}/${acronyms.length} F1Session drivers to DB drivers`)

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
  return positionMap
}

// Fetches qualifying positions from the OpenF1 REST API for a specific round number.
// Used as a fallback when no F1Session document exists in MongoDB (e.g., server crashed
// before progressive save could run). Fetches driver acronyms and final positions,
// then maps them to DB Driver._id strings.
export const fetchPositionsFromAPI = async (roundNumber: number): Promise<Map<string, number> | null> => {
  try {
    const token = await getOpenF1Token()
    if (!token) {
      log.warn("No OpenF1 token — cannot fetch historical positions from API")
      return null
    }
    const headers = { Authorization: `Bearer ${token}` }

    // Fetch all qualifying sessions for the current year.
    interface SessionSchedule { session_key: number; date_start: string }
    const sessionsRes = await axios.get<SessionSchedule[]>(
      `${OPENF1_API_BASE}/sessions`,
      { params: { year: new Date().getFullYear(), session_name: "Qualifying" }, headers, timeout: 10000 },
    )
    const allSessions = (sessionsRes.data || [])
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())

    // Pick the session at the correct index (roundNumber is 1-indexed).
    const targetSession = allSessions[roundNumber - 1]
    if (!targetSession) {
      log.warn(`No qualifying session found for round ${roundNumber} (${allSessions.length} sessions total)`)
      return null
    }

    const sessionKey = targetSession.session_key
    log.info(`Fetching historical positions from OpenF1 API for session ${sessionKey} (round ${roundNumber})`)

    // Fetch driver info and position data for this session.
    const [driversRes, positionsRes] = await Promise.all([
      axios.get<OpenF1DriverMsg[]>(`${OPENF1_API_BASE}/drivers?session_key=${sessionKey}`, { headers, timeout: 10000 }),
      axios.get<OpenF1PositionMsg[]>(`${OPENF1_API_BASE}/position?session_key=${sessionKey}`, { headers, timeout: 10000 }),
    ])

    // Build final position per driver (last position entry wins).
    const finalPositions = new Map<number, number>()
    for (const pos of positionsRes.data || []) {
      finalPositions.set(pos.driver_number, pos.position)
    }

    // Map driver_number → name_acronym for the DB lookup.
    const acronymByNumber = new Map<number, string>()
    for (const driver of driversRes.data || []) {
      acronymByNumber.set(driver.driver_number, driver.name_acronym)
    }

    // Build acronym → position map.
    const acronymPositions = new Map<string, number>()
    finalPositions.forEach((position, driverNumber) => {
      const acronym = acronymByNumber.get(driverNumber)
      if (acronym) acronymPositions.set(acronym, position)
    })

    if (acronymPositions.size === 0) {
      log.warn(`No position data returned from API for session ${sessionKey}`)
      return null
    }

    // Map acronyms to DB Driver._id strings.
    const acronyms = Array.from(acronymPositions.keys())
    const dbDrivers = await Driver.find({ driverID: { $in: acronyms } })
    const positionMap = new Map<string, number>()
    for (const dbDriver of dbDrivers) {
      const position = acronymPositions.get(dbDriver.driverID)
      if (position !== undefined) {
        positionMap.set(dbDriver._id.toString(), position)
      }
    }

    log.info(`API position map built: ${positionMap.size} drivers with positions (session ${sessionKey})`)
    return positionMap.size > 0 ? positionMap : null
  } catch (err) {
    log.error("Failed to fetch positions from OpenF1 API:", err)
    return null
  }
}

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

    // Build position map from the F1Session driver data.
    const positionMap = await buildPositionMap(f1Session)

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

// Processes a single championship: finds a round in the target status,
// maps positions, runs resultsHandler, and broadcasts the transition.
// Returns true if the round was successfully processed.
export const processChampionship = async (
  champ: InstanceType<typeof Champ>,
  positionMap: Map<string, number>,
  io: Server,
  targetStatus: RoundStatus = "betting_closed",
): Promise<boolean> => {
  const champId = champ._id.toString()

  // Find the current round in the target status.
  const roundIndex = champ.rounds.findIndex((r) => r.status === targetStatus)
  if (roundIndex === -1) {
    log.verbose(`Championship "${champ.name}" has no round in ${targetStatus} — skipping`)
    return false
  }

  const round = champ.rounds[roundIndex]

  // Guard against double execution.
  if (round.resultsProcessed) {
    log.warn(`Championship "${champ.name}" round ${roundIndex + 1} already processed — skipping`)
    return false
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
    return false
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
  return true
}
