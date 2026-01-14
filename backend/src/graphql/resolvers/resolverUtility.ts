import { ObjectId } from "mongodb"
import Team, { teamType } from "../../models/team"
import { throwError } from "./resolverErrors"
import Driver, { driverType } from "../../models/driver"
import Champ, { Round, CompetitorEntry, PointsStructureEntry, ChampType } from "../../models/champ"
import Badge from "../../models/badge"
import User from "../../models/user"
import moment from "moment"
import { badgeCheckerRegistry, BadgeContext } from "../../shared/badgeEvaluators"

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
 * Converts actual qualifying position to P10-centric rank index.
 * P10 = 0 (best), P9 = 1, P8 = 2, ..., P1 = 9, P11 = 10, P12 = 11, etc.
 * This follows the P10 game hierarchy: P10 > P9 > P8 > ... > P1 > P11 > P12 > ...
 */
export const positionToRankIndex = (position: number): number => {
  if (position === 10) return 0 // P10 is the target (best)
  if (position < 10) return 10 - position // P1-P9: P9=1, P8=2, ..., P1=9
  return position - 1 // P11=10, P12=11, P13=12, etc.
}

/**
 * Calculates and awards points to competitors based on their bets and driver positions.
 * Handles both standard points structures (Default, F1, Moto GP, Abundant) and Tight Arse mode.
 *
 * Updates: competitor.points, competitor.totalPoints, competitor.position
 * Sets: round.winner, round.runnerUp
 *
 * @param round - The round to calculate points for (modified in place)
 * @param pointsStructure - The championship's points structure
 */
export const calculateCompetitorPoints = (
  round: Round,
  pointsStructure: PointsStructureEntry[],
): void => {
  // Build map of driverId -> positionActual for quick lookup.
  const driverPositions = new Map<string, number>(
    round.drivers.map((d) => [d.driver.toString(), d.positionActual]),
  )

  // Detect Tight Arse mode: only 2 entries, one has position: 0 (runner-up placeholder).
  const isTightArse = pointsStructure.length === 2 && pointsStructure.some((p) => p.position === 0)

  // For each competitor, determine their bet's finishing position and rank.
  const competitorResults: Array<{
    competitorId: string
    betDriverId: string | null
    positionActual: number | null
    rankIndex: number
  }> = round.competitors.map((c) => {
    const betDriverId = c.bet?.toString() || null
    const positionActual = betDriverId ? driverPositions.get(betDriverId) ?? null : null
    const rankIndex = positionActual !== null ? positionToRankIndex(positionActual) : Infinity

    return {
      competitorId: c.competitor.toString(),
      betDriverId,
      positionActual,
      rankIndex,
    }
  })

  // Sort by rankIndex ascending (best rank = lowest index = first).
  competitorResults.sort((a, b) => a.rankIndex - b.rankIndex)

  // Reset all competitor points for this round before calculating.
  round.competitors.forEach((c) => {
    c.points = 0
  })

  // Clear winner/runnerUp before calculating.
  round.winner = null
  round.runnerUp = null

  if (isTightArse) {
    // TIGHT ARSE MODE:
    // Winner (2 pts): ONLY if someone bet on exact P10
    // Runner-up (1 pt): Best in top 10 using P10 hierarchy (not the winner)
    const winnerPoints = pointsStructure.find((p) => p.position === 10)?.points || 2
    const runnerUpPoints = pointsStructure.find((p) => p.position === 0)?.points || 1

    let winnerId: string | null = null
    let runnerUpId: string | null = null

    for (const result of competitorResults) {
      // Check for exact P10 winner.
      if (result.positionActual === 10 && !winnerId) {
        winnerId = result.competitorId
        const competitor = round.competitors.find((c) => c.competitor.toString() === winnerId)
        if (competitor) {
          competitor.points = winnerPoints
          competitor.totalPoints += winnerPoints
        }
      } else if (
        result.positionActual !== null &&
        result.positionActual <= 10 &&
        !runnerUpId &&
        result.competitorId !== winnerId
      ) {
        // Best in top 10 (not winner) = runner-up.
        runnerUpId = result.competitorId
        const competitor = round.competitors.find((c) => c.competitor.toString() === runnerUpId)
        if (competitor) {
          competitor.points = runnerUpPoints
          competitor.totalPoints += runnerUpPoints
        }
      }
    }

    // Set winner/runnerUp on round.
    round.winner = winnerId ? new ObjectId(winnerId) : null
    round.runnerUp = runnerUpId ? new ObjectId(runnerUpId) : null
  } else {
    // STANDARD MODE:
    // Award points based on the driver's actual position matching the pointsStructure.
    let winnerSet = false
    let runnerUpSet = false

    competitorResults.forEach((result) => {
      const competitor = round.competitors.find(
        (c) => c.competitor.toString() === result.competitorId,
      )
      if (!competitor) return

      // Find points for this driver's actual qualifying position.
      const pointsEntry = pointsStructure.find((p) => p.position === result.positionActual)
      const pointsEarned = pointsEntry?.points || 0

      competitor.points = pointsEarned
      competitor.totalPoints += pointsEarned

      // Set winner (first competitor with points) and runnerUp (second with points).
      if (pointsEarned > 0 && !winnerSet) {
        round.winner = new ObjectId(result.competitorId)
        winnerSet = true
      } else if (pointsEarned > 0 && !runnerUpSet) {
        round.runnerUp = new ObjectId(result.competitorId)
        runnerUpSet = true
      }
    })
  }

  // Recalculate standings (position) based on totalPoints.
  const sortedByTotal = [...round.competitors].sort((a, b) => b.totalPoints - a.totalPoints)
  sortedByTotal.forEach((sortedCompetitor, idx) => {
    const original = round.competitors.find(
      (c) => c.competitor.toString() === sortedCompetitor.competitor.toString(),
    )
    if (original) {
      original.position = idx + 1
    }
  })

  console.log(
    `[calculateCompetitorPoints] Calculated points for ${round.competitors.length} competitors. ` +
      `Winner: ${round.winner?.toString() || "none"}, RunnerUp: ${
        round.runnerUp?.toString() || "none"
      }`,
  )
}

/**
 * Calculates points for each driver using P10-centric ranking.
 * Drivers are ranked by how close they finished to P10.
 *
 * RANKING: P10 > P9 > P8 > ... > P1 > P11 > P12 > ...
 * (Same hierarchy as competitor betting)
 *
 * Standard mode: Points based on positionActual matching pointsStructure.position
 * Tight Arse mode: P10 driver gets winner points (2), P9 driver gets runner-up (1), rest get 0
 *
 * Updates: driver.points, driver.totalPoints, driver.position, driver.positionDrivers
 */
export const calculateDriverPoints = (
  round: Round,
  pointsStructure: PointsStructureEntry[],
): void => {
  // Reset round points before calculating.
  round.drivers.forEach((d) => {
    d.points = 0
  })

  // Detect Tight Arse mode: only 2 entries, one has position: 0 (runner-up placeholder).
  const isTightArse = pointsStructure.length === 2 && pointsStructure.some((p) => p.position === 0)

  // Sort drivers by P10-centric rank (closest to P10 first).
  const sortedByRank = [...round.drivers].sort((a, b) => {
    return positionToRankIndex(a.positionActual) - positionToRankIndex(b.positionActual)
  })

  if (isTightArse) {
    // TIGHT ARSE MODE:
    // Winner (2 pts): Driver who finished exactly P10
    // Runner-up (1 pt): Driver who finished closest to P10 (P9), always awarded
    const winnerPoints = pointsStructure.find((p) => p.position === 10)?.points || 2
    const runnerUpPoints = pointsStructure.find((p) => p.position === 0)?.points || 1

    let winnerAwarded = false
    let runnerUpAwarded = false

    for (const driverEntry of sortedByRank) {
      const original = round.drivers.find(
        (d) => d.driver.toString() === driverEntry.driver.toString(),
      )
      if (!original) continue

      if (driverEntry.positionActual === 10 && !winnerAwarded) {
        // Exact P10 = winner.
        original.points = winnerPoints
        original.totalPoints += winnerPoints
        winnerAwarded = true
      } else if (!runnerUpAwarded && driverEntry.positionActual <= 10) {
        // Best in top 10 (not winner) = runner-up.
        original.points = runnerUpPoints
        original.totalPoints += runnerUpPoints
        runnerUpAwarded = true
      }

      if (winnerAwarded && runnerUpAwarded) break
    }
  } else {
    // STANDARD MODE:
    // Award points based on positionActual matching pointsStructure.position.
    round.drivers.forEach((driverEntry) => {
      const pointsEntry = pointsStructure.find((p) => p.position === driverEntry.positionActual)
      const pointsEarned = pointsEntry?.points || 0

      driverEntry.points = pointsEarned
      driverEntry.totalPoints += pointsEarned
    })
  }

  // Calculate round position (rank by P10 hierarchy - closest to P10 wins).
  sortedByRank.forEach((sorted, idx) => {
    const original = round.drivers.find((d) => d.driver.toString() === sorted.driver.toString())
    if (original) original.position = idx + 1
  })

  // Calculate season standing positionDrivers (rank by totalPoints, highest first).
  const sortedByTotalPoints = [...round.drivers].sort((a, b) => b.totalPoints - a.totalPoints)
  sortedByTotalPoints.forEach((sorted, idx) => {
    const original = round.drivers.find((d) => d.driver.toString() === sorted.driver.toString())
    if (original) original.positionDrivers = idx + 1
  })

  console.log(`[calculateDriverPoints] Calculated points for ${round.drivers.length} drivers`)
}

/**
 * Calculates points for each team by summing their drivers' points.
 * Must be called AFTER calculateDriverPoints.
 *
 * Updates: team.points, team.totalPoints, team.position, team.positionConstructors
 */
export const calculateTeamPoints = (round: Round): void => {
  // Reset round points before calculating.
  round.teams.forEach((t) => {
    t.points = 0
  })

  // Sum driver points for each team.
  round.teams.forEach((teamEntry) => {
    const teamDriverIds = new Set(teamEntry.drivers.map((d) => d.toString()))

    // Find all drivers in this team and sum their points.
    const teamDriversInRound = round.drivers.filter((d) => teamDriverIds.has(d.driver.toString()))

    const roundPoints = teamDriversInRound.reduce((sum, d) => sum + d.points, 0)

    teamEntry.points = roundPoints
    teamEntry.totalPoints += roundPoints
  })

  // Calculate round position (rank by this round's points, highest first).
  const sortedByRoundPoints = [...round.teams].sort((a, b) => b.points - a.points)
  sortedByRoundPoints.forEach((sorted, idx) => {
    const original = round.teams.find((t) => t.team.toString() === sorted.team.toString())
    if (original) original.position = idx + 1
  })

  // Calculate season standing positionConstructors (rank by totalPoints, highest first).
  const sortedByTotalPoints = [...round.teams].sort((a, b) => b.totalPoints - a.totalPoints)
  sortedByTotalPoints.forEach((sorted, idx) => {
    const original = round.teams.find((t) => t.team.toString() === sorted.team.toString())
    if (original) original.positionConstructors = idx + 1
  })

  console.log(`[calculateTeamPoints] Calculated points for ${round.teams.length} teams`)
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
 * CURRENT FUNCTIONALITY (IMPLEMENTED):
 * ============================================================================
 *
 * STEP 1: POPULATE NEXT ROUND
 * - Carry forward competitors to next round with totalPoints preserved
 *
 * STEP 2: CALCULATE COMPETITOR POINTS
 * - Award points to competitors based on their bet vs driver's positionActual
 * - P10-centric: P10 > P9 > P8 > ... > P1 > P11 > P12 > ...
 * - Set round.winner and round.runnerUp
 *
 * STEP 4: CALCULATE DRIVER POINTS
 * - Award points to drivers using same P10-centric hierarchy
 * - Tight Arse: P10 driver = 2pts (winner), P9 driver = 1pt (runner-up)
 * - Sync totalPoints and positionDrivers to next round
 *
 * STEP 5: CALCULATE TEAM POINTS
 * - Sum drivers' points for each team
 * - Sync totalPoints and positionConstructors to next round
 *
 * STEP 3: BADGE AWARDS
 * - Check each badge's unlock criteria against the round results
 * - Award badges to users who have met the criteria
 *
 * ============================================================================
 * FUTURE FUNCTIONALITY (TO BE IMPLEMENTED):
 * ============================================================================
 *
 * STEP 6: NOTIFICATIONS
 * - Notify users of their results
 * - Notify badge earners
 * - Notify of position changes in standings
 *
 * ============================================================================
 */

// Update driver stats for round completion and championship standings.
// Increments roundsCompleted for all drivers, roundsWon for P10 finisher,
// and at championship end, updates champsCompleted, champsWon, and positionHistory.
// Uses bulkWrite for performance (single DB call instead of 40+).
const updateDriverStats = async (
  currentRound: Round,
  champ: ChampType,
  roundIndex: number,
): Promise<void> => {
  const isChampEnd = roundIndex === champ.rounds.length - 1

  // Build bulk operations for all drivers.
  const bulkOps = currentRound.drivers.map((driverEntry) => {
    const updateOps: Record<string, number> = {
      "stats.roundsCompleted": 1,
    }

    // If driver finished P10 (the target position), increment roundsWon.
    if (driverEntry.positionActual === 10) {
      updateOps["stats.roundsWon"] = 1
    }

    // At championship end, increment champsCompleted.
    if (isChampEnd) {
      updateOps["stats.champsCompleted"] = 1

      // If driver won the championship (positionDrivers === 1), increment champsWon.
      if (driverEntry.positionDrivers === 1) {
        updateOps["stats.champsWon"] = 1
      }
    }

    // Update positionHistory array (index 0 = P1, index 9 = P10).
    // This tracks how many times a driver has finished in each position.
    if (driverEntry.positionActual > 0) {
      const posIndex = driverEntry.positionActual - 1
      updateOps[`stats.positionHistory.${posIndex}`] = 1
    }

    return {
      updateOne: {
        filter: { _id: driverEntry.driver },
        update: { $inc: updateOps },
      },
    }
  })

  // Single bulk operation instead of multiple individual calls.
  if (bulkOps.length > 0) {
    await Driver.bulkWrite(bulkOps)
  }

  console.log(
    `[updateDriverStats] Updated stats for ${currentRound.drivers.length} drivers` +
      (isChampEnd ? " (championship end)" : ""),
  )
}

// Award badges to competitors based on badge criteria.
// Evaluates all championship badges against each competitor.
// Uses batch operations for performance.
const awardBadges = async (
  champ: ChampType,
  currentRound: Round,
  roundIndex: number,
): Promise<void> => {
  // Load all badge definitions for this championship.
  if (!champ.champBadges || champ.champBadges.length === 0) {
    return
  }

  const champBadges = await Badge.find({ _id: { $in: champ.champBadges } })
  if (champBadges.length === 0) {
    return
  }

  // Load driver data for attribute-based badges (oldest, tallest, moustache, etc.).
  const driverIds = currentRound.drivers.map((d) => d.driver)
  const drivers = await Driver.find({ _id: { $in: driverIds } })
  const populatedDrivers = new Map<string, driverType>(
    drivers.map((d) => [d._id.toString(), d]),
  )

  // Track awards to batch save at end.
  const badgeAwards: { badgeId: ObjectId; competitorId: ObjectId; awardedHow: string }[] = []
  const userBadgeUpdates: { userId: ObjectId; badgeId: ObjectId; dateTime: string }[] = []
  const dateTime = moment().format()

  // Track already awarded within this evaluation to avoid duplicate checks.
  const newlyAwarded = new Set<string>()

  // For each competitor in the current round.
  for (const competitorEntry of currentRound.competitors) {
    // Build context for badge evaluation.
    const ctx: BadgeContext = {
      competitorId: competitorEntry.competitor,
      currentRound,
      currentRoundIndex: roundIndex,
      champ,
      allRounds: champ.rounds,
      maxCompetitors: champ.settings?.maxCompetitors || 24,
    }

    // Evaluate each badge.
    for (const badge of champBadges) {
      const awardKey = `${badge._id}-${competitorEntry.competitor}`

      // Skip if already awarded to this competitor (from DB or this evaluation).
      const alreadyAwarded =
        badge.awardedTo?.some((u) => u.toString() === competitorEntry.competitor.toString()) ||
        newlyAwarded.has(awardKey)
      if (alreadyAwarded) {
        continue
      }

      // Get checker function for this badge.
      const checker = badgeCheckerRegistry.get(badge.awardedHow)
      if (!checker) {
        continue
      }

      // Evaluate badge criteria.
      const result = checker(ctx, populatedDrivers)

      if (result.earned) {
        // Track award for batch save.
        badgeAwards.push({
          badgeId: badge._id,
          competitorId: competitorEntry.competitor,
          awardedHow: badge.awardedHow,
        })
        userBadgeUpdates.push({
          userId: competitorEntry.competitor,
          badgeId: badge._id,
          dateTime,
        })
        newlyAwarded.add(awardKey)

        console.log(
          `[awardBadges] Awarded "${badge.awardedHow}" to competitor ${competitorEntry.competitor}`,
        )
      }
    }
  }

  // Batch save badge awards.
  if (badgeAwards.length > 0) {
    const badgeBulkOps = badgeAwards.map((award) => ({
      updateOne: {
        filter: { _id: award.badgeId },
        update: {
          $addToSet: { awardedTo: award.competitorId },
          $set: { updated_at: dateTime },
        },
      },
    }))
    await Badge.bulkWrite(badgeBulkOps)

    // Batch save user badge updates.
    const userBulkOps = userBadgeUpdates.map((update) => ({
      updateOne: {
        filter: { _id: update.userId },
        update: {
          $addToSet: {
            badges: {
              badge: update.badgeId,
              dateTime: update.dateTime,
            },
          },
        },
      },
    }))
    await User.bulkWrite(userBulkOps)

    console.log(`[awardBadges] Batch saved ${badgeAwards.length} badge awards`)
  }
}

export const resultsHandler = async (champId: string, roundIndex: number): Promise<void> => {
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

    console.log(
      `[resultsHandler] Populated ${nextRound.competitors.length} competitors to round ${
        roundIndex + 2
      }`,
    )
  }

  // ============================================================================
  // STEP 2: CALCULATE COMPETITOR POINTS
  // ============================================================================
  // Calculate points for each competitor based on their bet and the driver's actual position.
  // This also sets round.winner and round.runnerUp, and recalculates standings.
  calculateCompetitorPoints(currentRound, champ.pointsStructure)

  // Re-sync updated totalPoints and positions to next round if it was already populated.
  if (hasNextRound) {
    const nextRound = champ.rounds[roundIndex + 1]
    currentRound.competitors.forEach((c) => {
      const nextCompetitor = nextRound.competitors.find(
        (nc) => nc.competitor.toString() === c.competitor.toString(),
      )
      if (nextCompetitor) {
        nextCompetitor.totalPoints = c.totalPoints
        nextCompetitor.position = c.position
      }
    })
  }

  // ============================================================================
  // STEP 4: CALCULATE DRIVER POINTS
  // ============================================================================
  // Award points to drivers based on their positionActual and the pointsStructure.
  // Uses P10-centric hierarchy (P10 > P9 > P8 > ... > P1 > P11 > P12 > ...).
  calculateDriverPoints(currentRound, champ.pointsStructure)

  // Sync driver data to next round.
  if (hasNextRound) {
    const nextRound = champ.rounds[roundIndex + 1]
    currentRound.drivers.forEach((d) => {
      const nextDriver = nextRound.drivers.find(
        (nd) => nd.driver.toString() === d.driver.toString(),
      )
      if (nextDriver) {
        nextDriver.totalPoints = d.totalPoints
        nextDriver.positionDrivers = d.positionDrivers
        // Reset round-specific fields for next round.
        nextDriver.points = 0
        nextDriver.position = 0
        nextDriver.positionActual = 0
      }
    })
  }

  // ============================================================================
  // STEP 5: CALCULATE TEAM POINTS
  // ============================================================================
  // Aggregate driver points by team for constructor standings.
  // Must be called after calculateDriverPoints.
  calculateTeamPoints(currentRound)

  // Sync team data to next round.
  if (hasNextRound) {
    const nextRound = champ.rounds[roundIndex + 1]
    currentRound.teams.forEach((t) => {
      const nextTeam = nextRound.teams.find((nt) => nt.team.toString() === t.team.toString())
      if (nextTeam) {
        nextTeam.totalPoints = t.totalPoints
        nextTeam.positionConstructors = t.positionConstructors
        // Reset round-specific fields for next round.
        nextTeam.points = 0
        nextTeam.position = 0
      }
    })
  }

  // ============================================================================
  // STEP 6: UPDATE DRIVER STATS
  // ============================================================================
  // Update driver statistics in the database:
  // - roundsCompleted: incremented for all drivers in the round
  // - roundsWon: incremented for driver who finished P10
  // - champsCompleted: incremented at championship end for all drivers
  // - champsWon: incremented at championship end for driver standings winner
  // - positionHistory: tracks finish count per position
  await updateDriverStats(currentRound, champ, roundIndex)

  // ============================================================================
  // STEP 3: AWARD BADGES
  // ============================================================================
  // For each competitor, evaluate all badge criteria and award earned badges.
  await awardBadges(champ, currentRound, roundIndex)

  // ============================================================================
  // STEP 6: SEND NOTIFICATIONS (FUTURE)
  // ============================================================================
  // TODO: Implement notification system:
  // - Notify users of their round results
  // - Notify users of badges earned
  // - Notify users of position changes

  // Save all changes to the database.
  // Mark rounds as modified so Mongoose detects changes to nested driver/team arrays.
  champ.markModified("rounds")
  champ.updated_at = moment().format()
  await champ.save()

  console.log(
    `[resultsHandler] Completed processing results for championship ${champId}, round ${
      roundIndex + 1
    }`,
  )
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
  console.log(
    `[checkRoundExpiry] Round ${activeRoundIndex + 1} expired after 24h, resetting to waiting`,
  )

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
