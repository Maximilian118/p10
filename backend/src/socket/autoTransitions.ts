import { Server } from "socket.io"
import Champ, { RoundStatus } from "../models/champ"
import { broadcastRoundStatusChange } from "./socketHandler"
import { resultsHandler } from "../graphql/resolvers/resolverUtility"
import moment from "moment"

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
    console.log(`[autoTransitions] Timer fired for ${key}, transitioning to ${targetStatus}`)

    try {
      await transitionRoundStatus(io, champId, roundIndex, targetStatus)
    } catch (err) {
      console.error(`Failed to auto-transition ${key} to ${targetStatus}:`, err)
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
  console.log(`[autoTransitions] Scheduling countdown transition: randomDelay=${randomDelay}ms, totalDelay=${totalDelay}ms`)
  scheduleAutoTransition(io, champId, roundIndex, "betting_open", totalDelay)
}

// Schedules auto-transition from results to completed after 5 minutes.
export const scheduleResultsTransition = (
  io: Server,
  champId: string,
  roundIndex: number
): void => {
  scheduleAutoTransition(io, champId, roundIndex, "completed", RESULTS_DURATION)
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
    console.error(`Championship ${champId} not found for auto-transition`)
    return
  }

  if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
    console.error(`Invalid round index ${roundIndex} for championship ${champId}`)
    return
  }

  champ.rounds[roundIndex].status = newStatus
  champ.rounds[roundIndex].statusChangedAt = moment().format()
  champ.updated_at = moment().format()
  await champ.save()

  // Execute resultsHandler when entering the results view.
  // This processes all results-related logic (points, badges, next round setup).
  if (newStatus === "results") {
    await resultsHandler(champId, roundIndex)
  }

  broadcastRoundStatusChange(io, champId, roundIndex, newStatus)
}
