import { Server } from "socket.io"
import moment from "moment"
import Champ from "../../models/champ"
import Series from "../../models/series"
import { populateRoundData } from "../../graphql/resolvers/champResolvers"
import { broadcastRoundStatusChange } from "../../socket/socketHandler"
import {
  scheduleCountdownTransition,
  scheduleBettingCloseTransition,
} from "../../socket/autoTransitions"
import { champPopulation } from "../../shared/population"
import { createLogger } from "../../shared/logger"

const log = createLogger("RoundAutomation")

// How often to check if any championship needs its round auto-opened (30 seconds).
const CHECK_INTERVAL = 30 * 1000

let checkTimer: NodeJS.Timeout | null = null
let ioServer: Server | null = null

// Checks all active championships with automation enabled and auto-opens
// rounds when the qualifying start time minus autoOpenTime has been reached.
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

      // Compute when the round should auto-open.
      const qualifyingStart = new Date(autoOpenData.timestamp).getTime()
      const autoOpenAt = qualifyingStart - (autoOpenTime * 60 * 1000)

      // Skip if not yet time to open.
      if (now < autoOpenAt) continue

      // Find the current round in "waiting" status.
      const roundIndex = champ.rounds.findIndex((r) => r.status === "waiting")
      if (roundIndex === -1) continue

      // Check that there are still rounds left to play.
      const completedCount = champ.rounds.filter((r) => r.status === "completed").length
      if (completedCount >= champ.rounds.length) continue

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

    log.info(`✓ Auto-opened round ${roundIndex + 1} for "${champ.name}" → ${initialStatus}`)
  } catch (err) {
    log.error(`Failed to auto-open round for "${champ.name}":`, err)
  }
}

// Starts the periodic check for rounds that need auto-opening.
export const startRoundAutomation = (io: Server): void => {
  if (checkTimer) return
  ioServer = io

  checkTimer = setInterval(checkAutoOpenRounds, CHECK_INTERVAL)
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
