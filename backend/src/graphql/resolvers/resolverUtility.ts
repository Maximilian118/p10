import { ObjectId } from "mongodb"
import Team, { teamType } from "../../models/team"
import { throwError } from "./resolverErrors"
import Driver, { driverType } from "../../models/driver"
import Champ, { Round, CompetitorEntry } from "../../models/champ"
import moment from "moment"

// Recalculate team.series based on all drivers' series.
// A team is in a series if ANY of its drivers compete in that series.
export const recalculateTeamSeries = async (teamId: ObjectId): Promise<void> => {
  const team = await Team.findById(teamId)
  if (!team) return

  // Find all drivers belonging to this team.
  const drivers = await Driver.find({ teams: teamId })

  // Aggregate unique series from all drivers.
  const seriesSet = new Set<string>()
  for (const driver of drivers) {
    for (const seriesId of driver.series) {
      seriesSet.add(seriesId.toString())
    }
  }

  // Update team.series.
  const newSeriesIds = Array.from(seriesSet).map((id) => new ObjectId(id))
  team.series = newSeriesIds
  team.updated_at = moment().format()
  await team.save()
}

// Recalculate series for multiple teams.
export const recalculateMultipleTeamsSeries = async (teamIds: ObjectId[]): Promise<void> => {
  // Deduplicate team IDs.
  const uniqueTeamIds = [...new Set(teamIds.map((id) => id.toString()))]

  for (const teamIdStr of uniqueTeamIds) {
    await recalculateTeamSeries(new ObjectId(teamIdStr))
  }
}

// Get all unique team IDs for a list of drivers.
export const getTeamsForDrivers = async (driverIds: ObjectId[]): Promise<ObjectId[]> => {
  const teamSet = new Set<string>()

  for (const driverId of driverIds) {
    const driver = await Driver.findById(driverId)
    if (driver) {
      for (const teamId of driver.teams) {
        teamSet.add(teamId.toString())
      }
    }
  }

  return Array.from(teamSet).map((id) => new ObjectId(id))
}

// Sync series-driver relationship bidirectionally when series.drivers changes.
// Removes series from old drivers and adds to new drivers.
export const syncSeriesDrivers = async (
  seriesId: ObjectId,
  oldDriverIds: ObjectId[],
  newDriverIds: ObjectId[],
): Promise<void> => {
  const oldSet = new Set(oldDriverIds.map((id) => id.toString()))
  const newSet = new Set(newDriverIds.map((id) => id.toString()))

  // Find drivers to remove series from (in old but not in new).
  const driversToRemoveFrom = oldDriverIds.filter((id) => !newSet.has(id.toString()))

  // Find drivers to add series to (in new but not in old).
  const driversToAddTo = newDriverIds.filter((id) => !oldSet.has(id.toString()))

  // Remove series from old drivers.
  for (const driverId of driversToRemoveFrom) {
    const driver = await Driver.findById(driverId)
    if (driver) {
      driver.series = driver.series.filter((s) => s.toString() !== seriesId.toString())
      driver.updated_at = moment().format()
      await driver.save()
    }
  }

  // Add series to new drivers.
  for (const driverId of driversToAddTo) {
    const driver = await Driver.findById(driverId)
    if (driver) {
      if (!driver.series.some((s) => s.toString() === seriesId.toString())) {
        driver.series.push(seriesId)
        driver.updated_at = moment().format()
        await driver.save()
      }
    }
  }
}
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
// Loop through an array of Driver ID's and ensure they all exist in the DB.
// Returning an array of found drivers.
export const updateDrivers = async (
  drivers: ObjectId[],
  team_id?: ObjectId,
  series_id?: ObjectId,
): Promise<driverType[]> => {
  const type = "drivers"
  const foundDrivers: driverType[] = []

  for (const _id of drivers) {
    const driver = await Driver.findById(_id)

    if (!driver) {
      throw throwError(type, _id, "One of the selected drivers doesn't exist.")
    }

    if (team_id || series_id) {
      team_id && driver.teams.push(team_id)
      series_id && driver.series.push(series_id)
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

// Sync team-driver relationship bidirectionally when drivers change.
// Removes team from old drivers and adds to new drivers.
export const syncTeamDrivers = async (
  teamId: ObjectId,
  oldDriverIds: ObjectId[],
  newDriverIds: ObjectId[],
): Promise<void> => {
  const oldSet = new Set(oldDriverIds.map((id) => id.toString()))
  const newSet = new Set(newDriverIds.map((id) => id.toString()))

  // Find drivers to remove team from (in old but not in new).
  const driversToRemoveFrom = oldDriverIds.filter((id) => !newSet.has(id.toString()))

  // Find drivers to add team to (in new but not in old).
  const driversToAddTo = newDriverIds.filter((id) => !oldSet.has(id.toString()))

  // Remove team from old drivers.
  for (const driverId of driversToRemoveFrom) {
    const driver = await Driver.findById(driverId)
    if (driver) {
      driver.teams = driver.teams.filter((t) => t.toString() !== teamId.toString())
      driver.updated_at = moment().format()
      await driver.save()
    }
  }

  // Add team to new drivers.
  for (const driverId of driversToAddTo) {
    const driver = await Driver.findById(driverId)
    if (driver) {
      if (!driver.teams.some((t) => t.toString() === teamId.toString())) {
        driver.teams.push(teamId)
        driver.updated_at = moment().format()
        await driver.save()
      }
    }
  }
}

/**
 * resultsHandler - Central function for processing round results.
 *
 * This function is called when a round transitions to "results" status.
 * It handles all logic that needs to execute when the results of a round are known.
 *
 * NOTE: This is internal backend logic, NOT a GraphQL resolver called by frontend.
 * It's triggered when:
 * - updateRoundStatus mutation transitions to "results"
 * - Auto-transition fires to "results"
 *
 * ============================================================================
 * CURRENT FUNCTIONALITY:
 * ============================================================================
 * - Populate the next round with all competitors from the completed round
 *   (preserves totalPoints, resets round points to 0)
 *
 * ============================================================================
 * P10 GAME POINTS CALCULATION LOGIC (TO BE IMPLEMENTED)
 * ============================================================================
 *
 * The P10 game awards points based on how close a competitor's bet was to P10
 * (10th place qualifying position). P10 is the TARGET position.
 *
 * POSITION VALUE ORDER (most valuable to least):
 * P10 → P9 → P8 → P7 → P6 → P5 → P4 → P3 → P2 → P1 → P11 → P12 → P13 → ...
 *
 * Key rules:
 * - P10 is always the most valuable (the target)
 * - Within top 10: closer to P10 is better (P9 beats P8, P8 beats P7, etc.)
 * - P1 (worst in top 10) is still more valuable than P11 (best outside top 10)
 * - Outside top 10: P11 beats P12, P12 beats P13, etc.
 *
 * Points structure array index mapping:
 * - Index 0: P10 (highest points)
 * - Index 1: P9
 * - Index 2: P8
 * - Index 3: P7
 * - Index 4: P6
 * - Index 5: P5
 * - Index 6: P4
 * - Index 7: P3
 * - Index 8: P2
 * - Index 9: P1
 * - Index 10: P11
 * - Index 11: P12
 * - Index 12+: P13, P14, etc.
 *
 * STANDARD POINTS STRUCTURES (Default, F1, Moto GP, Abundant):
 * - Points are stored in the order above: [P10 pts, P9 pts, ..., P1 pts, P11 pts, ...]
 * - Each competitor's bet is evaluated: find where their driver finished
 * - Award points based on position's index in the order above
 * - Winner: Highest points scorer this round
 * - Runner Up: Second highest points scorer
 *
 * "TIGHT ARSE" POINTS STRUCTURE (Special Case):
 * - Only 2 point values: Winner (2 pts) and Runner Up (1 pt)
 * - Winner: Competitor who bet on the driver who finished EXACTLY P10
 *   - If nobody guessed P10, there is NO Winner for that round
 * - Runner Up: Best-placed competitor (excluding winner), using position order above
 *   - Must have bet on a driver who finished in the top 10 to qualify as runner up
 *   - If no other competitor bet on a top-10 driver, there is no runner up
 *
 * IMPLEMENTATION PSEUDOCODE:
 * 1. Get all competitors and their bets for this round
 * 2. Get the actual qualifying positions for all drivers (from DriverEntry.positionActual)
 * 3. For each competitor:
 *    a. Find what position their bet finished in
 *    b. Convert position to rank using the order above (P10=0, P9=1, ..., P1=9, P11=10, ...)
 * 4. Sort competitors by rank (ascending = best first)
 * 5. Award points based on pointsStructure:
 *    - Standard: Use the sorted rank to index into pointsStructure
 *    - Tight Arse: First place (if P10 exact) gets 2, second place (if top-10) gets 1
 * 6. Set round.winner and round.runnerUp ObjectIds
 * 7. Update competitor.points and competitor.totalPoints
 * 8. Recalculate competitor.position based on totalPoints
 *
 * ============================================================================
 * FUTURE FUNCTIONALITY (TO BE IMPLEMENTED):
 * ============================================================================
 *
 * 1. BADGE AWARDS
 *    - Check each badge's unlock criteria against the round results
 *    - Award badges to users who have met the criteria
 *    - Badges may include:
 *      - First win badge
 *      - Streak badges (consecutive correct predictions)
 *      - Perfect round badges
 *      - Position-based badges (e.g., predicted exact P10)
 *      - Milestone badges (total points thresholds)
 *
 * 2. DRIVER POINTS CALCULATION
 *    - Calculate points for each driver based on their qualifying position
 *    - Update driver standings for the series
 *    - This is separate from competitor points - tracks actual F1-style driver standings
 *
 * 3. TEAM POINTS CALCULATION
 *    - Aggregate driver points by team
 *    - Update team standings for the series
 *    - Calculate constructor-style championship standings
 *
 * 4. NOTIFICATIONS
 *    - Notify users of their results
 *    - Notify badge earners
 *    - Notify of position changes in standings
 *
 * ============================================================================
 */
export const resultsHandler = async (
  champId: string,
  roundIndex: number
): Promise<void> => {
  const champ = await Champ.findById(champId)
  if (!champ) {
    console.error(`[resultsHandler] Championship ${champId} not found`)
    return
  }

  if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
    console.error(`[resultsHandler] Invalid round index ${roundIndex} for championship ${champId}`)
    return
  }

  const currentRound = champ.rounds[roundIndex]

  // ============================================================================
  // STEP 1: POPULATE NEXT ROUND WITH COMPETITORS
  // ============================================================================
  // Use championship-level competitors as the roster (source of truth).
  // Preserve totalPoints from current round for existing competitors.
  // New joiners who aren't in current round get totalPoints: 0.

  const hasNextRound = roundIndex + 1 < champ.rounds.length
  if (hasNextRound) {
    const nextRound = champ.rounds[roundIndex + 1]

    // Build map of totalPoints from current round for carry-over.
    const currentTotals = new Map<string, { totalPoints: number; position: number }>(
      currentRound.competitors.map((c) => [
        c.competitor.toString(),
        { totalPoints: c.totalPoints, position: c.position },
      ]),
    )

    // Use championship-level competitors as the roster.
    const roster = champ.competitors || []

    // Create entries for ALL championship competitors.
    nextRound.competitors = roster.map((userId) => {
      const userIdStr = userId.toString()
      const prevData = currentTotals.get(userIdStr)

      return {
        competitor: userId,
        bet: null, // Reset bet for the new round
        points: 0, // Reset points for the new round
        position: prevData?.position || roster.length, // New joiners start last
        totalPoints: prevData?.totalPoints || 0, // New joiners get 0
        updated_at: null,
        created_at: null,
      }
    })

    console.log(`[resultsHandler] Populated ${nextRound.competitors.length} competitors to round ${roundIndex + 2}`)
  }

  // ============================================================================
  // STEP 2: CALCULATE COMPETITOR POINTS (FUTURE)
  // ============================================================================
  // TODO: Implement points calculation based on:
  // - champ.pointsStructure (array of { position, points })
  // - Each competitor's bet (which driver they picked)
  // - The actual qualifying results (driver finishing positions)
  //
  // Pseudocode:
  // for each competitor in currentRound.competitors:
  //   driverPosition = getDriverFinishPosition(competitor.bet)
  //   pointsEarned = champ.pointsStructure.find(p => p.position === driverPosition)?.points || 0
  //   competitor.points = pointsEarned
  //   competitor.totalPoints += pointsEarned
  //
  // Then recalculate positions based on totalPoints.

  // ============================================================================
  // STEP 3: AWARD BADGES (FUTURE)
  // ============================================================================
  // TODO: Implement badge awarding logic:
  // - Load all badge definitions
  // - For each badge, check if any competitor has met the unlock criteria
  // - Award badges to qualifying users
  // - Store badge award timestamp and round context

  // ============================================================================
  // STEP 4: CALCULATE DRIVER POINTS (FUTURE)
  // ============================================================================
  // TODO: Implement driver points calculation:
  // - Retrieve qualifying results for this round
  // - Apply points structure to determine driver points
  // - Update driver standings in the series

  // ============================================================================
  // STEP 5: CALCULATE TEAM POINTS (FUTURE)
  // ============================================================================
  // TODO: Implement team points calculation:
  // - Aggregate driver points by their team
  // - Update team standings in the series

  // ============================================================================
  // STEP 6: SEND NOTIFICATIONS (FUTURE)
  // ============================================================================
  // TODO: Implement notification system:
  // - Notify users of their round results
  // - Notify users of badges earned
  // - Notify users of position changes

  // Save all changes to the database.
  champ.updated_at = moment().format()
  await champ.save()

  console.log(`[resultsHandler] Completed processing results for championship ${champId}, round ${roundIndex + 1}`)
}

// 24 hours in milliseconds.
const ROUND_EXPIRY_MS = 24 * 60 * 60 * 1000

// Active statuses that are subject to 24h expiry.
const ACTIVE_STATUSES = ["countDown", "betting_open", "betting_closed", "results"]

/**
 * checkRoundExpiry - Checks if any active round has expired (24h since status changed).
 *
 * If a round has been in an active status for more than 24 hours:
 * - Resets status to "waiting"
 * - Clears all competitor bets
 * - Updates statusChangedAt
 *
 * @param champ - The championship document (must be a Mongoose document, not populated)
 * @returns true if a round was expired and reset, false otherwise
 */
export const checkRoundExpiry = async (champ: ChampDocument): Promise<boolean> => {
  // Find current active round (first non-completed round).
  const activeRoundIndex = champ.rounds.findIndex((r: Round) => r.status !== "completed")
  if (activeRoundIndex === -1) return false

  const round = champ.rounds[activeRoundIndex]

  // Only check active statuses (not waiting or completed).
  if (!ACTIVE_STATUSES.includes(round.status)) return false

  // Check if statusChangedAt exists and is older than 24h.
  if (!round.statusChangedAt) return false

  const statusChangedTime = moment(round.statusChangedAt)
  const now = moment()
  const hoursSinceChange = now.diff(statusChangedTime, "milliseconds")

  if (hoursSinceChange < ROUND_EXPIRY_MS) return false

  // Round has expired - reset to waiting and clear bets.
  console.log(`[checkRoundExpiry] Round ${activeRoundIndex + 1} expired after 24h, resetting to waiting`)

  round.status = "waiting"
  round.statusChangedAt = moment().format()

  // Clear all competitor bets for this round.
  round.competitors = round.competitors.map((c: CompetitorEntry) => ({
    ...c,
    bet: null,
    updated_at: null,
    created_at: null,
  }))

  champ.updated_at = moment().format()
  await champ.save()

  return true
}

// Type for Mongoose document (used for checkRoundExpiry).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChampDocument = any
