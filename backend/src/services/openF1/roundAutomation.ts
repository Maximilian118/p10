import { Server } from "socket.io"
import moment from "moment"
import Champ, { ACTIVE_ROUND_STATUSES } from "../../models/champ"
import League from "../../models/league"
import Series from "../../models/series"
import { populateRoundData } from "../../graphql/resolvers/champResolvers"
import {
  broadcastRoundStatusChange,
} from "../../socket/socketHandler"
import {
  scheduleCountdownTransition,
  scheduleBettingCloseTransition,
  computeBettingCloseAt,
} from "../../socket/autoTransitions"
import { champPopulation } from "../../shared/population"
import { sendNotificationToMany } from "../../shared/notifications"
import { getActiveSessionInfo } from "./sessionManager"
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

// Tracks scheduled precise auto-open timers per championship with the expected autoOpenAt time.
// Used to detect timestamp changes and reschedule when qualifying sessions are moved.
const scheduledAutoOpenTimers = new Map<string, { timer: NodeJS.Timeout; autoOpenAt: number }>()

// Schedules a precise auto-open for a championship at the exact autoOpenAt time + 1 second.
// The 1-second buffer lets the frontend "Get Ready!" text display before the countDown view broadcasts.
// If a timer already exists with a different autoOpenAt, it is cancelled and rescheduled.
const scheduleRoundAutoOpen = (champId: string, autoOpenAt: number): void => {
  if (!ioServer) return

  const existing = scheduledAutoOpenTimers.get(champId)
  if (existing) {
    // Timestamp unchanged — keep existing timer.
    if (existing.autoOpenAt === autoOpenAt) return
    // Timestamp changed — cancel old timer and reschedule.
    clearTimeout(existing.timer)
    scheduledAutoOpenTimers.delete(champId)
    log.info(`Rescheduling auto-open for champId=${champId} (timestamp changed)`)
  }

  const delayMs = autoOpenAt - Date.now() + 1000
  if (delayMs <= 0) return

  const timer = setTimeout(async () => {
    scheduledAutoOpenTimers.delete(champId)
    if (!ioServer) return

    try {
      // Re-fetch championship to validate current state before opening.
      const freshChamp = await Champ.findById(champId)
      if (!freshChamp) return

      // Guard: skip if any round is already active.
      const hasActive = freshChamp.rounds.some((r) => ACTIVE_ROUND_STATUSES.includes(r.status))
      if (hasActive) return

      // Guard: skip if no waiting round exists.
      const freshRoundIndex = freshChamp.rounds.findIndex((r) => r.status === "waiting")
      if (freshRoundIndex === -1) return

      // Guard: skip if auto-open timestamp was cleared (round already opened by adjudicator).
      const freshTimestamp = freshChamp.settings.automation.bettingWindow.autoOpenData?.timestamp
      if (!freshTimestamp) return

      warnedChampIds.delete(champId)

      log.info(`Precise auto-open firing for "${freshChamp.name}" round ${freshRoundIndex + 1}`)
      await autoOpenRound(freshChamp, freshRoundIndex)
    } catch (err) {
      log.error(`Precise auto-open failed for champId=${champId}:`, err)
    }
  }, delayMs)

  scheduledAutoOpenTimers.set(champId, { timer, autoOpenAt })
  log.info(`Scheduled precise auto-open for champId=${champId} in ${Math.round(delayMs / 1000)}s`)
}

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

      // Compute when the round should auto-open and when the countdown should start (30 min before).
      const qualifyingStart = new Date(autoOpenData.timestamp).getTime()
      const autoOpenAt = qualifyingStart - (autoOpenTime * 60 * 1000)
      const countDownAt = autoOpenAt - 1800 * 1000

      // Guard: skip if any round is already in an active state (prevents cascading opens).
      const hasActiveRound = champ.rounds.some((r) => ACTIVE_ROUND_STATUSES.includes(r.status))
      if (hasActiveRound) continue

      // Find the current round in "waiting" status.
      const roundIndex = champ.rounds.findIndex((r) => r.status === "waiting")
      if (roundIndex === -1) continue

      // Check that there are still rounds left to play.
      const completedCount = champ.rounds.filter((r) => r.status === "completed").length
      if (completedCount >= champ.rounds.length) continue

      // Send 5-minute warning notification before countdown starts (once per round).
      const timeUntilCountDown = countDownAt - now
      if (timeUntilCountDown > 0 && timeUntilCountDown <= WARNING_WINDOW_MS && !warnedChampIds.has(champId)) {
        warnedChampIds.add(champId)
        if (champ.competitors.length > 0) {
          await sendNotificationToMany(champ.competitors, {
            type: "round_started",
            title: "Round Starting Soon",
            description: `Round ${roundIndex + 1} in ${champ.name} countdown starts in 5 minutes.`,
            champId: champ._id,
            champName: champ.name,
            champIcon: champ.icon,
          })
          log.info(`5-minute warning sent for "${champ.name}" round ${roundIndex + 1}`)
        }
      }

      // Schedule a precise timer for countdown start based on the API qualifying timestamp.
      if (now < countDownAt) {
        scheduleRoundAutoOpen(champId, countDownAt)
        continue
      }

      // Clear the warning flag once the countdown fires.
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

    // Compute bettingCloseAt BEFORE save so it's included in the initial broadcast.
    // Always compute while qualifying timestamp is still available (cleared after save).
    if (champ.settings.automation.bettingWindow.autoClose) {
      champ.rounds[roundIndex].bettingCloseAt = computeBettingCloseAt(
        champ.settings.automation.bettingWindow,
        champ.rounds[roundIndex].statusChangedAt,
      )
    }

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
    }, undefined, champ.rounds[roundIndex].bettingCloseAt)

    // Schedule the countdown → betting_open transition if not skipping.
    if (!skipCountDown) {
      scheduleCountdownTransition(ioServer, champId, roundIndex, 1800 * 1000)
      // Schedule auto-close from the pre-computed bettingCloseAt deadline.
      if (champ.rounds[roundIndex].bettingCloseAt) {
        const closeDelayMs = Math.max(0, new Date(champ.rounds[roundIndex].bettingCloseAt).getTime() - Date.now())
        scheduleBettingCloseTransition(ioServer, champId, roundIndex, closeDelayMs)
      }
    } else if (champ.rounds[roundIndex].bettingCloseAt) {
      // Skip countdown — schedule auto-close using the pre-computed bettingCloseAt deadline.
      const closeDelayMs = Math.max(0, new Date(champ.rounds[roundIndex].bettingCloseAt).getTime() - Date.now())
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
        description: `Round ${roundIndex + 1} countdown has started for ${champ.name}.`,
        champId: champ._id,
        champName: champ.name,
        champIcon: champ.icon,
      })
    }

    // Clear the auto-open timestamp so this championship won't be auto-opened again.
    // The timestamp gets restored to the next qualifying date by:
    // - refreshNextQualifyingForChamp() after round results are processed
    // - Hourly qualifying schedule poll
    champ.settings.automation.bettingWindow.autoOpenData.timestamp = ""
    champ.markModified("settings")
    await champ.save()

    log.info(`✓ Auto-opened round ${roundIndex + 1} for "${champ.name}" → ${initialStatus}`)
  } catch (err) {
    log.error(`Failed to auto-open round for "${champ.name}":`, err)
  }
}

// Reverts rounds stuck in betting_open or betting_closed for longer than the timeout.
// This handles cases where F1 session data never arrives (cancelled session, API failure, driver mapping issues).
// Skipped while an F1 session is active — the session will end naturally and trigger auto-results.
const revertStuckRounds = async (): Promise<void> => {
  if (!ioServer) return

  // Don't revert rounds while an F1 session is active — it will end naturally
  // and trigger auto-results. Reverting now would prevent results from processing.
  const sessionInfo = getActiveSessionInfo()
  if (sessionInfo.active) return

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

// Stops the periodic check and clears all scheduled auto-open timers.
export const stopRoundAutomation = (): void => {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }

  // Clear all scheduled precise auto-open timers.
  for (const { timer } of scheduledAutoOpenTimers.values()) {
    clearTimeout(timer)
  }
  scheduledAutoOpenTimers.clear()

  log.info("Round automation stopped")
}
