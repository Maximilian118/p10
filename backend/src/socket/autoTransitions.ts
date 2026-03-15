import { Server } from "socket.io"
import Champ, { RoundStatus } from "../models/champ"
import Series from "../models/series"
import { broadcastRoundStatusChange } from "./socketHandler"
import { resultsHandler, archiveSeason } from "../graphql/resolvers/resolverUtility"
import { champPopulation } from "../shared/population"
import { resolveMissedRound } from "../services/openF1/missedRoundHandler"
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

// Computes the exact betting close timestamp based on qualifying start time.
// Uses qualifying timestamp when available for precise anchoring;
// falls back to round open time + full window duration.
export const computeBettingCloseAt = (
  bettingWindow: { autoOpen: boolean; autoOpenTime: number; autoCloseTime: number; autoOpenData?: { timestamp: string } },
  previousStatusChangedAt: string | null,
): string => {
  const { autoOpen, autoOpenTime, autoCloseTime, autoOpenData } = bettingWindow

  // Anchor directly to qualifying session start when available.
  if (autoOpen && autoOpenData?.timestamp) {
    const qualifyingStart = new Date(autoOpenData.timestamp).getTime()
    return new Date(qualifyingStart + (autoCloseTime || 5) * 60 * 1000).toISOString()
  }

  // Qualifying timestamp cleared (auto-open already fired).
  // Compute from original round-open time + full window.
  if (autoOpen && previousStatusChangedAt) {
    const totalMs = ((autoOpenTime || 10) + (autoCloseTime || 5)) * 60 * 1000
    return new Date(new Date(previousStatusChangedAt).getTime() + totalMs).toISOString()
  }

  // Manual open (autoOpen OFF): close after autoCloseTime from now.
  return new Date(Date.now() + (autoCloseTime || 5) * 60 * 1000).toISOString()
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

        // Betting open: reset to waiting so adjudicator can restart cleanly.
        // Bets may be incomplete at this stage.
        if (status === "betting_open") {
          log.info(` Recovering stuck ${status}: champ=${champ._id} (${champ.name}), round=${i + 1}`)
          champ.rounds[i].status = "waiting"
          champ.rounds[i].statusChangedAt = null
          champ.updated_at = moment().format()
          await champ.save()
          broadcastRoundStatusChange(io, champ._id.toString(), i, "waiting")
        }

        // Betting closed: attempt retroactive recovery before falling back to waiting.
        // Bets are finalized and preserved in round.competitors[].bet.
        if (status === "betting_closed") {
          log.info(` Found betting_closed round: champ=${champ._id} (${champ.name}), round=${i + 1} — attempting retroactive recovery`)

          // Only attempt recovery for API-enabled series.
          const series = await Series.findById(champ.series)
          if (series?.hasAPI) {
            const result = await resolveMissedRound(champ, i + 1, io)
            if (result === "recovered") {
              log.info(` ✓ Retroactive recovery succeeded for "${champ.name}" round ${i + 1}`)
              break // Skip remaining rounds for this championship.
            }
            if (result === "completed") {
              log.info(` ✓ Clean completion for "${champ.name}" round ${i + 1} (no bets)`)
              break
            }
            // "deferred" or null — fall through to reset below.
            log.info(` Retroactive recovery deferred for "${champ.name}" round ${i + 1} — resetting to waiting`)
          }

          // Fallback: reset to waiting. Bets are preserved for the hourly poll to retry.
          champ.rounds[i].status = "waiting"
          champ.rounds[i].statusChangedAt = null
          champ.updated_at = moment().format()
          await champ.save()
          broadcastRoundStatusChange(io, champ._id.toString(), i, "waiting")
        }

        // Waiting with existing bets: round was previously active and got reset by an earlier restart.
        // Only recover if bettingCloseAt is in the past (qualifying session has ended).
        if (status === "waiting") {
          const hasBets = round.competitors.length > 0 &&
            round.competitors.some((c) => c.bet !== null && c.bet !== undefined)
          const hasDrivers = round.drivers.length > 0
          const bettingClosed = round.bettingCloseAt && new Date(round.bettingCloseAt).getTime() < Date.now()

          if (hasBets && hasDrivers && bettingClosed) {
            const series = await Series.findById(champ.series)
            if (series?.hasAPI) {
              log.info(` Found waiting round with bets (betting closed at ${round.bettingCloseAt}): champ=${champ._id} (${champ.name}), round=${i + 1} — attempting recovery`)
              const result = await resolveMissedRound(champ, i + 1, io)
              if (result === "recovered") {
                log.info(` ✓ Recovered waiting round for "${champ.name}" round ${i + 1}`)
                break
              }
              if (result === "completed") {
                log.info(` ✓ Clean completion for "${champ.name}" round ${i + 1}`)
                break
              }
              // "deferred" or null — leave as waiting, hourly poll will retry.
              log.info(` Recovery deferred for "${champ.name}" round ${i + 1} — leaving as waiting`)
            }
          }
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

  // Verify round is still in the expected pre-transition state (prevents stale timers).
  const expectedPrevious: Record<string, string> = {
    betting_open: "countDown",
    betting_closed: "betting_open",
    completed: "results",
  }
  const expected = expectedPrevious[newStatus]
  if (expected && champ.rounds[roundIndex].status !== expected) {
    log.warn(`Skipping stale transition for round ${roundIndex}: is '${champ.rounds[roundIndex].status}', expected '${expected}'`)
    return
  }

  // Save previous statusChangedAt for bettingCloseAt computation (may be countDown start time).
  const previousStatusChangedAt = champ.rounds[roundIndex].statusChangedAt

  champ.rounds[roundIndex].status = newStatus
  champ.rounds[roundIndex].statusChangedAt = moment().format()
  champ.updated_at = moment().format()

  // Compute and store bettingCloseAt when entering betting_open with autoClose enabled.
  if (newStatus === "betting_open" && champ.settings?.automation?.bettingWindow?.autoClose) {
    const bettingCloseAt = computeBettingCloseAt(
      champ.settings.automation.bettingWindow,
      previousStatusChangedAt,
    )
    champ.rounds[roundIndex].bettingCloseAt = bettingCloseAt
  }

  await champ.save()

  // Schedule auto-close of betting window using the computed bettingCloseAt deadline.
  if (newStatus === "betting_open" && champ.rounds[roundIndex].bettingCloseAt) {
    const closeDelayMs = Math.max(0, new Date(champ.rounds[roundIndex].bettingCloseAt).getTime() - Date.now())
    scheduleBettingCloseTransition(io, champId, roundIndex, closeDelayMs)
  }

  // Execute resultsHandler when entering the results view.
  // This processes all results-related logic (points, badges, next round setup).
  // Re-fetch with population so the socket broadcast includes calculated results data.
  if (newStatus === "results") {
    // Determine if this is the last round BEFORE archival changes the rounds array.
    const isLastRound = roundIndex === champ.rounds.length - 1

    await resultsHandler(champId, roundIndex)

    // Archive season if this is the last round.
    if (isLastRound) {
      await archiveSeason(champId)
    }

    const populatedChamp = await Champ.findById(champId).populate(champPopulation).exec()
    if (populatedChamp) {
      // After archival, the old round index may point to a new season's round.
      const populatedRound = populatedChamp.rounds[roundIndex] || populatedChamp.rounds[0]
      const seasonEndInfo = isLastRound
        ? { isSeasonEnd: true, seasonEndedAt: populatedChamp.seasonEndedAt || moment().format() }
        : undefined

      broadcastRoundStatusChange(io, champId, roundIndex, newStatus, {
        drivers: populatedRound.drivers,
        competitors: populatedRound.competitors,
        teams: populatedRound.teams,
      }, seasonEndInfo)

      // Only schedule auto-transition to completed for non-final rounds.
      if (!isLastRound) {
        scheduleAutoTransition(io, champId, roundIndex, "completed", RESULTS_DURATION)
      }
      return
    }
  }

  broadcastRoundStatusChange(io, champId, roundIndex, newStatus, undefined, undefined,
    champ.rounds[roundIndex].bettingCloseAt)
}
