import { Server } from "socket.io"
import Champ, { RoundStatus } from "../models/champ"
import { broadcastRoundStatusChange } from "./socketHandler"
import { resultsHandler } from "../graphql/resolvers/resolverUtility"
import { champPopulation } from "../shared/population"
import moment from "moment"
import { createLogger } from "../shared/logger"

const log = createLogger("AutoTransitions")

// Store active timers per championship to allow cancellation.
// Key format: `${champId}:${roundIndex}`
const activeTimers: Map<string, NodeJS.Timeout> = new Map()

// Timer durations in milliseconds.
const COUNTDOWN_DURATION = 30 * 1000 // 30 seconds
const RESULTS_DURATION = 5 * 60 * 1000 // 5 minutes

// Returns a weighted random delay between 0.5s and 5s, centered around 2s using triangular distribution.
// This simulates the "human factor" of a race starter pressing the button after lights are all red.
const randomiseRoundStartTime = (): number => {
  const min = 0.5
  const max = 5
  const mode = 2
  const u = Math.random()
  const fc = (mode - min) / (max - min)

  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min))
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
}

// Creates a unique key for timer storage.
const getTimerKey = (champId: string, roundIndex: number): string => {
  return `${champId}:${roundIndex}`
}

// Cancels any existing timer for a championship round.
export const cancelTimer = (champId: string, roundIndex: number): void => {
  const key = getTimerKey(champId, roundIndex)
  const existingTimer = activeTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    activeTimers.delete(key)
  }
}

// Schedules an auto-transition to the target status after a delay.
const scheduleAutoTransition = (
  io: Server,
  champId: string,
  roundIndex: number,
  targetStatus: RoundStatus,
  delayMs: number
): void => {
  cancelTimer(champId, roundIndex)

  const key = getTimerKey(champId, roundIndex)

  const timer = setTimeout(async () => {
    // Always remove timer from map when it fires, regardless of success/failure.
    activeTimers.delete(key)
    log.info(` Timer fired for ${key}, transitioning to ${targetStatus}`)

    try {
      await transitionRoundStatus(io, champId, roundIndex, targetStatus)
    } catch (err) {
      log.error(`Failed to auto-transition ${key} to ${targetStatus}:`, err)
    }
  }, delayMs)

  activeTimers.set(key, timer)
}

// Schedules auto-transition from countDown to betting_open after 30 seconds + random delay.
// The random delay (0.5-5s) simulates the race start "lights out" moment.
export const scheduleCountdownTransition = (
  io: Server,
  champId: string,
  roundIndex: number
): void => {
  const randomDelay = randomiseRoundStartTime() * 1000
  const totalDelay = COUNTDOWN_DURATION + randomDelay
  log.info(` Scheduling countdown transition: randomDelay=${randomDelay}ms, totalDelay=${totalDelay}ms`)
  scheduleAutoTransition(io, champId, roundIndex, "betting_open", totalDelay)
}

// Schedules auto-transition from betting_open to betting_closed after the configured delay.
export const scheduleBettingCloseTransition = (
  io: Server,
  champId: string,
  roundIndex: number,
  delayMs: number
): void => {
  log.info(` Scheduling betting close transition: delay=${Math.round(delayMs / 1000)}s`)
  scheduleAutoTransition(io, champId, roundIndex, "betting_closed", delayMs)
}

// Schedules auto-transition from results to completed after 5 minutes.
export const scheduleResultsTransition = (
  io: Server,
  champId: string,
  roundIndex: number
): void => {
  scheduleAutoTransition(io, champId, roundIndex, "completed", RESULTS_DURATION)
}

// Recovers rounds stuck in intermediate statuses after a server restart.
// Pre-results statuses (countDown, betting_open, betting_closed) are reset to "waiting".
// Results rounds beyond 6 minutes are transitioned to "completed" (resultsHandler already ran on entry).
export const recoverStuckRounds = async (io: Server): Promise<void> => {
  try {
    const champs = await Champ.find({ active: true })

    for (const champ of champs) {
      for (let i = 0; i < champ.rounds.length; i++) {
        const round = champ.rounds[i]
        const { status } = round

        // Countdown: re-schedule timer for remaining time, or reset to waiting if exceeded.
        if (status === "countDown" && round.statusChangedAt) {
          const elapsedMs = moment().diff(moment(round.statusChangedAt))
          if (elapsedMs < COUNTDOWN_DURATION) {
            // Still within countdown duration — re-schedule timer for remaining time.
            const remainingMs = COUNTDOWN_DURATION - elapsedMs
            log.info(` Re-scheduling countdown timer: champ=${champ._id} (${champ.name}), round=${i + 1}, remaining=${Math.round(remainingMs / 1000)}s`)
            scheduleAutoTransition(io, champ._id.toString(), i, "betting_open", remainingMs)
          } else {
            // Countdown expired — reset to waiting so adjudicator can restart cleanly.
            log.info(` Countdown expired, resetting to waiting: champ=${champ._id} (${champ.name}), round=${i + 1}`)
            champ.rounds[i].status = "waiting"
            champ.rounds[i].statusChangedAt = null
            champ.updated_at = moment().format()
            await champ.save()
            broadcastRoundStatusChange(io, champ._id.toString(), i, "waiting")
          }
        }

        // Betting open/closed: reset to waiting so adjudicator can restart cleanly.
        // These statuses require user interaction, so continuing after a disruption isn't ideal.
        if (status === "betting_open" || status === "betting_closed") {
          log.info(` Recovering stuck ${status}: champ=${champ._id} (${champ.name}), round=${i + 1}`)
          champ.rounds[i].status = "waiting"
          champ.rounds[i].statusChangedAt = null
          champ.updated_at = moment().format()
          await champ.save()
          broadcastRoundStatusChange(io, champ._id.toString(), i, "waiting")
        }

        // Results: re-schedule timer for remaining time, or transition to completed if exceeded.
        if (status === "results" && round.statusChangedAt) {
          const elapsedMs = moment().diff(moment(round.statusChangedAt))
          if (elapsedMs > RESULTS_DURATION + 60000) {
            // More than 6 minutes elapsed — transition immediately to completed.
            log.info(` Recovering stuck results: champ=${champ._id} (${champ.name}), round=${i + 1}`)
            await transitionRoundStatus(io, champ._id.toString(), i, "completed")
          } else if (elapsedMs < RESULTS_DURATION) {
            // Still within results duration — re-schedule timer for remaining time.
            const remainingMs = RESULTS_DURATION - elapsedMs
            log.info(` Re-scheduling results timer: champ=${champ._id} (${champ.name}), round=${i + 1}, remaining=${Math.round(remainingMs / 1000)}s`)
            scheduleAutoTransition(io, champ._id.toString(), i, "completed", remainingMs)
          } else {
            // Between 5-6 minutes — transition to completed now (grace period expired).
            log.info(` Results grace period expired: champ=${champ._id} (${champ.name}), round=${i + 1}`)
            await transitionRoundStatus(io, champ._id.toString(), i, "completed")
          }
        }
      }
    }
  } catch (err) {
    log.error("Failed to recover stuck rounds:", err)
  }
}

// Updates round status in database and broadcasts the change.
const transitionRoundStatus = async (
  io: Server,
  champId: string,
  roundIndex: number,
  newStatus: RoundStatus
): Promise<void> => {
  const champ = await Champ.findById(champId)
  if (!champ) {
    log.error(`Championship ${champId} not found for auto-transition`)
    return
  }

  if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
    log.error(`Invalid round index ${roundIndex} for championship ${champId}`)
    return
  }

  champ.rounds[roundIndex].status = newStatus
  champ.rounds[roundIndex].statusChangedAt = moment().format()
  champ.updated_at = moment().format()
  await champ.save()

  // Schedule auto-close of betting window when entering betting_open (if automation enabled).
  if (newStatus === "betting_open" && champ.settings?.automation?.bettingWindow?.autoClose) {
    const closeDelayMs = (champ.settings.automation.bettingWindow.autoCloseTime || 5) * 60 * 1000
    scheduleBettingCloseTransition(io, champId, roundIndex, closeDelayMs)
  }

  // Execute resultsHandler when entering the results view.
  // This processes all results-related logic (points, badges, next round setup).
  // Re-fetch with population so the socket broadcast includes calculated results data.
  if (newStatus === "results") {
    await resultsHandler(champId, roundIndex)

    const populatedChamp = await Champ.findById(champId).populate(champPopulation).exec()
    if (populatedChamp) {
      const populatedRound = populatedChamp.rounds[roundIndex]
      broadcastRoundStatusChange(io, champId, roundIndex, newStatus, {
        drivers: populatedRound.drivers,
        competitors: populatedRound.competitors,
        teams: populatedRound.teams,
      })
      return
    }
  }

  broadcastRoundStatusChange(io, champId, roundIndex, newStatus)
}
