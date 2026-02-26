import moment from "moment"
import Champ, { Round } from "../../models/champ"
import League from "../../models/league"
import Series from "../../models/series"
import { recalculateLeagueStandings } from "../../shared/leagueScoring"
import { sendNotificationToMany } from "../../shared/notifications"
import { createLogger } from "../../shared/logger"

const log = createLogger("MissedRoundHandler")

// Auto-completes the next waiting round on a championship.
// Carries forward competitors from the last completed round with 0 new points.
// Does NOT run full resultsHandler — no drivers, bets, or badges.
export const autoCompleteMissedRound = async (champ: InstanceType<typeof Champ>): Promise<boolean> => {
  // Find the first waiting round.
  const waitingIndex = champ.rounds.findIndex((r: Round) => r.status === "waiting")
  if (waitingIndex < 0) return false

  const waitingRound = champ.rounds[waitingIndex]
  const now = moment().format()

  // Carry forward competitors from the previous completed round.
  if (waitingIndex > 0) {
    const prevRound = champ.rounds[waitingIndex - 1]
    waitingRound.competitors = prevRound.competitors.map((c) => ({
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
    // First round — use championship competitors roster with 0 points.
    waitingRound.competitors = champ.competitors.map((userId, idx) => ({
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

  // Mark as completed with no results data.
  waitingRound.status = "completed"
  waitingRound.statusChangedAt = now
  waitingRound.resultsProcessed = true
  waitingRound.drivers = []
  waitingRound.randomisedDrivers = []
  waitingRound.teams = []
  waitingRound.winner = null
  waitingRound.runnerUp = null

  champ.markModified("rounds")
  champ.updated_at = now
  await champ.save()

  log.info(`Auto-completed round ${waitingRound.round} for championship "${champ.name}"`)
  return true
}

// Detects and handles missed rounds for all league-enrolled championships.
// Called from the hourly qualifying schedule poll.
export const detectAndHandleMissedRounds = async (completedCount: number): Promise<void> => {
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

    for (const league of leagues) {
      let leagueModified = false

      for (const member of league.championships) {
        if (!member.active) continue

        // Load the championship.
        const champ = await Champ.findById(member.championship)
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

        // Auto-complete each missed round and increment penalty.
        for (let i = 0; i < missedCount; i++) {
          const completed = await autoCompleteMissedRound(champ)
          if (!completed) break

          // Increment missed rounds penalty on the league member.
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

      // Recalculate standings and save if any modifications were made.
      if (leagueModified) {
        recalculateLeagueStandings(league.championships)
        league.markModified("championships")
        league.updated_at = moment().format()
        await league.save()
        log.info(`Recalculated standings for league "${league.name}" after missed round detection`)
      }
    }
  } catch (err) {
    log.error("Failed to detect/handle missed rounds:", err)
  }
}
