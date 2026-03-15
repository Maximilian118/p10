import { Server } from "socket.io"
import moment from "moment"
import Champ, { Round } from "../../models/champ"
import F1Session from "../../models/f1Session"
import League from "../../models/league"
import Series from "../../models/series"
import { recalculateLeagueStandings } from "../../shared/leagueScoring"
import { sendNotificationToMany } from "../../shared/notifications"
import { buildPositionMap, fetchPositionsFromAPI, processChampionship } from "./autoResults"
import { createLogger } from "../../shared/logger"

const log = createLogger("MissedRoundHandler")

// Result of a missed round resolution attempt.
export type MissedRoundResult = "recovered" | "completed" | "deferred"

// Resolves a missed round for a championship. Never destroys existing data.
// Tries to process with real results if bets and position data exist,
// otherwise marks the round as completed to advance the championship count.
//
// Data source priority for positions:
//   1. F1Session in MongoDB (from progressive saves during the live session)
//   2. OpenF1 REST API (historical qualifying data)
//
// Returns:
//   "recovered" — round processed with full results pipeline (points, badges, etc.)
//   "completed" — round marked as completed without results (no bets or no positions)
//   "deferred"  — has bets but neither data source has positions yet (retry later)
export const resolveMissedRound = async (
  champ: InstanceType<typeof Champ>,
  roundNumber: number,
  io: Server | null,
): Promise<MissedRoundResult | null> => {
  // Find the first unresolved round (anything that isn't completed or results).
  let roundIndex = champ.rounds.findIndex((r: Round) => r.status === "betting_closed")
  if (roundIndex < 0) {
    roundIndex = champ.rounds.findIndex((r: Round) =>
      r.status === "waiting" || r.status === "countDown" || r.status === "betting_open",
    )
  }
  if (roundIndex < 0) return null

  const round = champ.rounds[roundIndex]

  // Guard against double execution.
  if (round.resultsProcessed) return null

  // Check if the round has any existing bets from users.
  const hasBets = round.competitors.length > 0 &&
    round.competitors.some((c) => c.bet !== null && c.bet !== undefined)

  // Check if the round has driver entries (populated during betting_open transition).
  const hasDrivers = round.drivers.length > 0

  // ─── Path A: Round has bets — try to process with real results ─────────
  if (hasBets && hasDrivers) {
    log.info(`Round ${round.round} of "${champ.name}" has bets — attempting retroactive recovery`)

    // Try source 1: F1Session in MongoDB.
    let positionMap: Map<string, number> | null = null
    const f1Session = await F1Session.findOne({
      status: "finished",
      sessionName: "Qualifying",
    }).sort({ endedAt: -1 }).exec()

    if (f1Session && f1Session.drivers.length > 0) {
      log.info(`Found F1Session (key: ${f1Session.sessionKey}) — building position map from MongoDB`)
      positionMap = await buildPositionMap(f1Session)
    }

    // Try source 2: OpenF1 REST API (if MongoDB didn't have the data).
    if (!positionMap || positionMap.size === 0) {
      log.info(`No F1Session in MongoDB — fetching positions from OpenF1 API (round ${roundNumber})`)
      positionMap = await fetchPositionsFromAPI(roundNumber)
    }

    // If neither source has data, defer (caller decides whether to force-complete).
    if (!positionMap || positionMap.size === 0) {
      log.warn(`No position data from either source for "${champ.name}" round ${round.round} — deferring`)
      return "deferred"
    }

    // Ensure round is in betting_closed for processChampionship.
    const originalStatus = round.status
    if (round.status !== "betting_closed") {
      round.status = "betting_closed"
      round.statusChangedAt = moment().format()
      champ.markModified("rounds")
      await champ.save()
    }

    // Process the round with real results.
    if (!io) {
      log.warn("No socket.io server available — retroactive results will not broadcast")
    }

    const success = await processChampionship(champ, positionMap, io!, "betting_closed")
    if (success) {
      log.info(`✓ Retroactively recovered round ${round.round} for "${champ.name}" with full results`)
      return "recovered"
    }

    // Processing failed — restore original status so the round isn't stuck.
    log.warn(`processChampionship failed for "${champ.name}" round ${round.round} — reverting status`)
    const freshChamp = await Champ.findById(champ._id)
    if (freshChamp) {
      freshChamp.rounds[roundIndex].status = originalStatus
      freshChamp.rounds[roundIndex].statusChangedAt = null
      freshChamp.markModified("rounds")
      await freshChamp.save()
    }
    return "deferred"
  }

  // ─── Path B: No bets — clean completion ────────────────────────────────
  log.info(`Round ${round.round} of "${champ.name}" has no bets — marking as completed`)

  const now = moment().format()

  // Populate competitors if the round has none (never started).
  if (round.competitors.length === 0) {
    if (roundIndex > 0) {
      // Carry forward from previous round.
      const prevRound = champ.rounds[roundIndex - 1]
      round.competitors = prevRound.competitors.map((c) => ({
        competitor: c.competitor,
        bet: null,
        points: 0,
        totalPoints: c.grandTotalPoints,
        grandTotalPoints: c.grandTotalPoints,
        adjustment: [],
        position: c.position,
        updated_at: null,
        created_at: null,
      }))
    } else {
      // First round — use championship competitors roster.
      round.competitors = champ.competitors.map((userId, idx) => ({
        competitor: userId,
        bet: null,
        points: 0,
        totalPoints: 0,
        grandTotalPoints: 0,
        adjustment: [],
        position: idx + 1,
        updated_at: null,
        created_at: null,
      }))
    }
  }

  // Ensure all competitor points are 0 for this round (no results = no points).
  round.competitors.forEach((c) => {
    c.points = 0
  })

  // Mark the round as completed.
  round.status = "completed"
  round.statusChangedAt = now
  round.resultsProcessed = true
  round.winner = null
  round.runnerUp = null

  // Populate next round competitors if it exists and is empty.
  if (roundIndex + 1 < champ.rounds.length) {
    const nextRound = champ.rounds[roundIndex + 1]
    if (nextRound.competitors.length === 0) {
      nextRound.competitors = round.competitors.map((c) => ({
        competitor: c.competitor,
        bet: null,
        points: 0,
        totalPoints: c.grandTotalPoints,
        grandTotalPoints: c.grandTotalPoints,
        adjustment: [],
        position: c.position,
        updated_at: null,
        created_at: null,
      }))
    }
  }

  champ.markModified("rounds")
  champ.updated_at = now
  await champ.save()

  log.info(`✓ Completed round ${round.round} for "${champ.name}" (no bets — clean completion)`)
  return "completed"
}

// Detects and handles missed rounds for all league-enrolled championships.
// Called from the hourly qualifying schedule poll.
export const detectAndHandleMissedRounds = async (
  completedCount: number,
  io: Server | null,
): Promise<void> => {
  try {
    // Find all API-enabled series.
    const apiSeries = await Series.find({ hasAPI: true })
    if (apiSeries.length === 0) return

    const apiSeriesIds = apiSeries.map((s) => s._id)

    // Find all leagues for API series that haven't ended their season.
    const leagues = await League.find({
      series: { $in: apiSeriesIds },
      seasonEndedAt: null,
    })

    // Batch-load all championships referenced by active league members (avoids N+1 queries).
    const allChampIds = leagues.flatMap((l) =>
      l.championships.filter((m) => m.active).map((m) => m.championship),
    )
    const allChamps = await Champ.find({ _id: { $in: allChampIds } })
    const champMap = new Map(allChamps.map((c) => [c._id.toString(), c]))

    for (const league of leagues) {
      let leagueModified = false

      for (const member of league.championships) {
        if (!member.active) continue

        // Look up the championship from the pre-loaded batch.
        const champ = champMap.get(member.championship.toString())
        if (!champ) continue

        // Count how many rounds the championship has actually completed.
        const champCompletedCount = champ.rounds.filter(
          (r: Round) => r.status === "completed" || r.status === "results",
        ).length

        // Calculate how many rounds were missed while in the league.
        const missedCount = completedCount - champCompletedCount
        if (missedCount <= 0) continue

        log.info(
          `Championship "${champ.name}" missed ${missedCount} round(s) ` +
          `(series: ${completedCount}, champ: ${champCompletedCount})`,
        )

        // Resolve each missed round using the unified handler.
        for (let i = 0; i < missedCount; i++) {
          // The round number for the next missed round.
          const roundNumber = champCompletedCount + i + 1
          const result = await resolveMissedRound(champ, roundNumber, io)

          if (!result) break // No more rounds to resolve.

          if (result === "recovered") {
            // Round was processed with real results — no league penalty.
            leagueModified = true
            log.info(`Round ${roundNumber} of "${champ.name}" recovered retroactively — no league penalty`)
          } else if (result === "completed" || result === "deferred") {
            // Round was auto-completed or forced-complete — apply league penalty.
            // "deferred" at hourly poll stage means both data sources failed; force-complete.
            if (result === "deferred") {
              log.warn(`Round ${roundNumber} of "${champ.name}" deferred but at hourly poll — forcing clean completion`)
              // Force clean completion by re-resolving without bet path
              // (the round still has bets but no position data is available from any source).
              const forceRound = champ.rounds.find((r: Round) => r.status === "betting_closed")
              if (forceRound) {
                forceRound.competitors.forEach((c) => { c.points = 0 })
                forceRound.status = "completed"
                forceRound.statusChangedAt = moment().format()
                forceRound.resultsProcessed = true
                forceRound.winner = null
                forceRound.runnerUp = null
                champ.markModified("rounds")
                champ.updated_at = moment().format()
                await champ.save()
                log.info(`Force-completed round ${roundNumber} for "${champ.name}" (no position data available)`)
              }
            }

            member.missedRounds = (member.missedRounds || 0) + 1
            leagueModified = true

            // Send missed round notification to all competitors.
            if (champ.competitors.length > 0) {
              await sendNotificationToMany(champ.competitors, {
                type: "round_missed",
                title: "Round Missed",
                description: `${champ.name} missed a qualifying round. A 5% league penalty has been applied.`,
                champId: champ._id,
                champName: champ.name,
                champIcon: champ.icon,
              })
            }
          }
        }
      }

      // Recalculate standings and save if any modifications were made.
      if (leagueModified) {
        recalculateLeagueStandings(league.championships)
        league.markModified("championships")
        league.updated_at = moment().format()
        await league.save()
        log.info(`Recalculated standings for league "${league.name}" after missed round handling`)
      }
    }
  } catch (err) {
    log.error("Failed to detect/handle missed rounds:", err)
  }
}
