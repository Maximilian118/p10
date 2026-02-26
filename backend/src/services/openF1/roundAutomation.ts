import { Server } from "socket.io"
import moment from "moment"
import Champ from "../../models/champ"
import League from "../../models/league"
import Series from "../../models/series"
import { populateRoundData } from "../../graphql/resolvers/champResolvers"
import {
  broadcastRoundStatusChange,
} from "../../socket/socketHandler"
import {
  scheduleCountdownTransition,
  scheduleBettingCloseTransition,
} from "../../socket/autoTransitions"
import { champPopulation } from "../../shared/population"
import { sendNotificationToMany } from "../../shared/notifications"
import { createLogger } from "../../shared/logger"

const log = createLogger("RoundAutomation")

// How often to check if any championship needs its round auto-opened (30 seconds).
const CHECK_INTERVAL = 30 * 1000

// 5-minute warning window in milliseconds.
const WARNING_WINDOW_MS = 5 * 60 * 1000

// Maximum time a round can stay in betting_open/betting_closed before being reverted to waiting.
const STUCK_ROUND_TIMEOUT = 60 * 60 * 1000 // 1 hour

let checkTimer: NodeJS.Timeout | null = null
let ioServer: Server | null = null

// Tracks which championships have already received a 5-minute warning (prevents duplicate sends across 30s polling cycles).
const warnedChampIds = new Set<string>()

// Checks all active championships with automation enabled and auto-opens
// rounds when the qualifying start time minus autoOpenTime has been reached.
// Also sends a 5-minute warning notification before auto-open.
const checkAutoOpenRounds = async (): Promise<void> => {
  if (!ioServer) return

  try {
    // Find all API-enabled series.
    const apiSeries = await Series.find({ hasAPI: true })
    if (apiSeries.length === 0) return
    const apiSeriesIds = apiSeries.map((s) => s._id)

    // Find active championships with auto-open enabled and a timestamp set.
    const champs = await Champ.find({
      active: true,
      series: { $in: apiSeriesIds },
      "settings.automation.enabled": true,
      "settings.automation.bettingWindow.autoOpen": true,
      "settings.automation.bettingWindow.autoOpenData.timestamp": { $ne: "" },
    })

    const now = Date.now()

    for (const champ of champs) {
      const { autoOpenTime, autoOpenData } = champ.settings.automation.bettingWindow
      if (!autoOpenData?.timestamp) continue

      const champId = champ._id.toString()

      // Compute when the round should auto-open.
      const qualifyingStart = new Date(autoOpenData.timestamp).getTime()
      const autoOpenAt = qualifyingStart - (autoOpenTime * 60 * 1000)

      // Find the current round in "waiting" status.
      const roundIndex = champ.rounds.findIndex((r) => r.status === "waiting")
      if (roundIndex === -1) continue

      // Check that there are still rounds left to play.
      const completedCount = champ.rounds.filter((r) => r.status === "completed").length
      if (completedCount >= champ.rounds.length) continue

      // Send 5-minute warning notification before auto-open (once per round).
      const timeUntilOpen = autoOpenAt - now
      if (timeUntilOpen > 0 && timeUntilOpen <= WARNING_WINDOW_MS && !warnedChampIds.has(champId)) {
        warnedChampIds.add(champId)
        if (champ.competitors.length > 0) {
          await sendNotificationToMany(champ.competitors, {
            type: "round_started",
            title: "Round Starting Soon",
            description: `Round ${roundIndex + 1} in ${champ.name} opens in 5 minutes.`,
            champId: champ._id,
            champName: champ.name,
            champIcon: champ.icon,
          })
          log.info(`5-minute warning sent for "${champ.name}" round ${roundIndex + 1}`)
        }
        continue
      }

      // Skip if not yet time to open.
      if (now < autoOpenAt) continue

      // Clear the warning flag once the round opens.
      warnedChampIds.delete(champId)

      log.info(`Auto-opening round ${roundIndex + 1} for "${champ.name}"`)

      await autoOpenRound(champ, roundIndex)
    }
  } catch (err) {
    log.error("Failed to check auto-open rounds:", err)
  }
}

// Auto-opens a round: populates data, transitions through countDown to betting_open,
// and schedules auto-close if enabled.
const autoOpenRound = async (
  champ: InstanceType<typeof Champ>,
  roundIndex: number,
): Promise<void> => {
  if (!ioServer) return

  const champId = champ._id.toString()

  try {
    // Populate round data (competitors, drivers, teams) — same as manual start.
    const roundData = await populateRoundData(champ, roundIndex)
    champ.rounds[roundIndex].competitors = roundData.competitors
    champ.rounds[roundIndex].drivers = roundData.drivers
    champ.rounds[roundIndex].randomisedDrivers = roundData.randomisedDrivers
    champ.rounds[roundIndex].teams = roundData.teams

    // Determine the initial status based on skipCountDown setting.
    const skipCountDown = champ.settings.skipCountDown
    const initialStatus = skipCountDown ? "betting_open" : "countDown"

    // Set the round status and save.
    champ.rounds[roundIndex].status = initialStatus
    champ.rounds[roundIndex].statusChangedAt = moment().format()
    champ.updated_at = moment().format()
    await champ.save()

    // Get populated champ for broadcasting.
    const populatedChamp = await Champ.findById(champId).populate(champPopulation).exec()
    if (!populatedChamp) return

    const populatedRound = populatedChamp.rounds[roundIndex]

    // Broadcast with round data so all clients get drivers/competitors/teams.
    broadcastRoundStatusChange(ioServer, champId, roundIndex, initialStatus, {
      drivers: populatedRound.drivers,
      competitors: populatedRound.competitors,
      teams: populatedRound.teams,
    })

    // Schedule the countdown → betting_open transition if not skipping.
    if (!skipCountDown) {
      scheduleCountdownTransition(ioServer, champId, roundIndex)
    } else if (champ.settings.automation.bettingWindow.autoClose) {
      // If we skipped countdown and went straight to betting_open, schedule auto-close.
      const closeDelayMs = (champ.settings.automation.bettingWindow.autoCloseTime || 5) * 60 * 1000
      scheduleBettingCloseTransition(ioServer, champId, roundIndex, closeDelayMs)
    }

    // Update lastRoundStartedAt on the league for invite expiry tracking.
    if (champ.league) {
      const now = moment().format()
      await League.updateOne(
        { _id: champ.league },
        { $set: { lastRoundStartedAt: now, updated_at: now } },
      )
    }

    // Send round_started notification to all competitors.
    if (champ.competitors.length > 0) {
      await sendNotificationToMany(champ.competitors, {
        type: "round_started",
        title: "Round Started",
        description: `Round ${roundIndex + 1} has been opened for ${champ.name}.`,
        champId: champ._id,
        champName: champ.name,
        champIcon: champ.icon,
      })
    }

    log.info(`✓ Auto-opened round ${roundIndex + 1} for "${champ.name}" → ${initialStatus}`)
  } catch (err) {
    log.error(`Failed to auto-open round for "${champ.name}":`, err)
  }
}

// Reverts rounds stuck in betting_open or betting_closed for longer than the timeout.
// This handles cases where F1 session data never arrives (cancelled session, API failure, driver mapping issues).
const revertStuckRounds = async (): Promise<void> => {
  if (!ioServer) return

  try {
    // Find all API-enabled series.
    const apiSeries = await Series.find({ hasAPI: true })
    if (apiSeries.length === 0) return
    const apiSeriesIds = apiSeries.map((s) => s._id)

    // Find active championships for API series.
    const champs = await Champ.find({
      active: true,
      series: { $in: apiSeriesIds },
    })

    const now = moment()

    for (const champ of champs) {
      for (let i = 0; i < champ.rounds.length; i++) {
        const round = champ.rounds[i]
        if (round.status !== "betting_open" && round.status !== "betting_closed") continue
        if (!round.statusChangedAt) continue

        const elapsedMs = now.diff(moment(round.statusChangedAt))
        if (elapsedMs <= STUCK_ROUND_TIMEOUT) continue

        // Round has been stuck for >1h — revert to waiting.
        log.info(
          `Reverting stuck ${round.status} round ${i + 1} for "${champ.name}" ` +
          `(stuck for ${Math.round(elapsedMs / 60000)} minutes)`,
        )

        champ.rounds[i].status = "waiting"
        champ.rounds[i].statusChangedAt = null
        champ.updated_at = moment().format()
        await champ.save()

        broadcastRoundStatusChange(ioServer, champ._id.toString(), i, "waiting")
      }
    }
  } catch (err) {
    log.error("Failed to revert stuck rounds:", err)
  }
}

// Runs both periodic checks: auto-open rounds and revert stuck rounds.
const runPeriodicChecks = async (): Promise<void> => {
  await checkAutoOpenRounds()
  await revertStuckRounds()
}

// Starts the periodic check for rounds that need auto-opening and stuck round detection.
export const startRoundAutomation = (io: Server): void => {
  if (checkTimer) return
  ioServer = io

  checkTimer = setInterval(runPeriodicChecks, CHECK_INTERVAL)
  log.info(`✓ Round automation started (checking every ${CHECK_INTERVAL / 1000}s)`)
}

// Stops the periodic check.
export const stopRoundAutomation = (): void => {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
    log.info("Round automation stopped")
  }
}
