// Badge evaluation utility helpers.

import { ObjectId } from "mongodb"
import { Round, CompetitorEntry, DriverEntry, PointsStructureEntry } from "../../models/champ"
import { driverType } from "../../models/driver"
import { BadgeContext } from "./types"

// European countries for nationality checks.
export const EUROPEAN_COUNTRIES = [
  "UK", "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium", "Finland",
  "Denmark", "Monaco", "Austria", "Poland", "Sweden", "Switzerland", "Russia",
]

// Check if current round is the last round of the championship.
export const isLastRound = (ctx: BadgeContext): boolean =>
  ctx.currentRoundIndex === ctx.allRounds.length - 1

// Check if a round is in a completed state.
export const isRoundCompleted = (round: Round): boolean =>
  round.status === "completed" || round.status === "results"

// Calculate driver age from birthday.
export const calculateDriverAge = (birthday: Date | string): number => {
  const birthDate = typeof birthday === "string" ? new Date(birthday) : birthday
  return (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
}

// Get competitor entry from a round.
export const getCompetitorEntry = (
  round: Round,
  competitorId: ObjectId,
): CompetitorEntry | undefined => {
  return round.competitors.find((c) => c.competitor.toString() === competitorId.toString())
}

// Get competitor's bet driver entry from round.
export const getCompetitorBetDriver = (
  round: Round,
  competitorId: ObjectId,
): DriverEntry | undefined => {
  const entry = getCompetitorEntry(round, competitorId)
  if (!entry?.bet) return undefined
  return round.drivers.find((d) => d.driver.toString() === entry.bet?.toString())
}

// Check if competitor won the round.
export const didCompetitorWin = (round: Round, competitorId: ObjectId): boolean => {
  return round.winner?.toString() === competitorId.toString()
}

// Check if competitor was runner-up.
export const didCompetitorRunnerUp = (round: Round, competitorId: ObjectId): boolean => {
  return round.runnerUp?.toString() === competitorId.toString()
}

// Check if competitor is on podium (top 3).
export const isOnPodium = (round: Round, competitorId: ObjectId): boolean => {
  const entry = getCompetitorEntry(round, competitorId)
  return entry ? entry.position <= 3 : false
}

// Check if competitor is in top N.
export const isInTopN = (round: Round, competitorId: ObjectId, n: number): boolean => {
  const entry = getCompetitorEntry(round, competitorId)
  return entry ? entry.position <= n : false
}

// Check if competitor is last.
export const isLast = (round: Round, competitorId: ObjectId): boolean => {
  const entry = getCompetitorEntry(round, competitorId)
  if (!entry || round.competitors.length === 0) return false
  const maxPosition = Math.max(...round.competitors.map((c) => c.position))
  return entry.position === maxPosition
}

// Check if competitor scored points in round.
export const didScorePoints = (round: Round, competitorId: ObjectId): boolean => {
  const entry = getCompetitorEntry(round, competitorId)
  return entry ? entry.points > 0 : false
}

// Check if competitor placed a bet in round.
export const didPlaceBet = (round: Round, competitorId: ObjectId): boolean => {
  const entry = getCompetitorEntry(round, competitorId)
  return entry?.bet !== null && entry?.bet !== undefined
}

// Get competitor's final entry from the last season in history.
export const getLastSeasonFinalEntry = (ctx: BadgeContext): CompetitorEntry | undefined => {
  const history = ctx.champ.history || []
  if (history.length === 0) return undefined
  const lastSeason = history[history.length - 1]
  const lastSeasonFinalRound = lastSeason?.rounds?.[lastSeason.rounds.length - 1]
  return lastSeasonFinalRound?.competitors?.find(
    (c) => c.competitor.toString() === ctx.competitorId.toString(),
  )
}

// Count total rounds played including history.
export const countTotalRoundsPlayed = (ctx: BadgeContext): number => {
  let count = 0
  for (const round of ctx.allRounds) {
    if (!isRoundCompleted(round)) continue
    if (didPlaceBet(round, ctx.competitorId)) count++
  }
  for (const season of ctx.champ.history || []) {
    for (const round of season.rounds || []) {
      if (round.status !== "completed") continue
      if (didPlaceBet(round, ctx.competitorId)) count++
    }
  }
  return count
}

// Count total wins for competitor in season (completed + current round).
export const countWinsInSeason = (rounds: Round[], competitorId: ObjectId): number => {
  return rounds.filter(
    (r) => (r.status === "completed" || r.status === "results") && didCompetitorWin(r, competitorId),
  ).length
}

// Count runner-ups in season.
export const countRunnerUpsInSeason = (rounds: Round[], competitorId: ObjectId): number => {
  return rounds.filter(
    (r) =>
      (r.status === "completed" || r.status === "results") && didCompetitorRunnerUp(r, competitorId),
  ).length
}

// Get consecutive rounds with a condition (returns streak length).
export const getStreakLength = (
  rounds: Round[],
  competitorId: ObjectId,
  upToRoundIndex: number,
  condition: (round: Round, compId: ObjectId) => boolean,
): number => {
  let streak = 0
  for (let i = upToRoundIndex; i >= 0; i--) {
    const round = rounds[i]
    if (round.status !== "completed" && round.status !== "results") continue
    if (condition(round, competitorId)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// Get consecutive rounds where competitor didn't place a bet.
export const getNoBetStreak = (
  rounds: Round[],
  competitorId: ObjectId,
  upToRoundIndex: number,
): number => {
  let streak = 0
  for (let i = upToRoundIndex; i >= 0; i--) {
    const round = rounds[i]
    if (round.status !== "completed" && round.status !== "results") continue
    if (!didPlaceBet(round, competitorId)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// Check if competitor bet on same driver for N consecutive rounds.
export const getSameDriverBetStreak = (
  rounds: Round[],
  competitorId: ObjectId,
  upToRoundIndex: number,
): number => {
  let streak = 0
  let lastDriverId: string | null = null

  for (let i = upToRoundIndex; i >= 0; i--) {
    const round = rounds[i]
    if (round.status !== "completed" && round.status !== "results") continue

    const entry = getCompetitorEntry(round, competitorId)
    if (!entry?.bet) break

    const currentDriverId = entry.bet.toString()
    if (lastDriverId === null) {
      lastDriverId = currentDriverId
      streak = 1
    } else if (currentDriverId === lastDriverId) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// Get unique drivers bet on in last N rounds.
export const getUniqueDriversBetInLastNRounds = (
  rounds: Round[],
  competitorId: ObjectId,
  upToRoundIndex: number,
  n: number,
): Set<string> => {
  const drivers = new Set<string>()
  let count = 0

  for (let i = upToRoundIndex; i >= 0 && count < n; i--) {
    const round = rounds[i]
    if (round.status !== "completed" && round.status !== "results") continue

    const entry = getCompetitorEntry(round, competitorId)
    if (entry?.bet) {
      drivers.add(entry.bet.toString())
      count++
    }
  }
  return drivers
}

// Get maximum points possible in a round.
export const getMaxPointsInRound = (pointsStructure: PointsStructureEntry[]): number => {
  if (!pointsStructure || pointsStructure.length === 0) return 0
  return Math.max(...pointsStructure.map((p) => p.points))
}

// Get driver with extreme stat value (oldest, youngest, tallest, etc.).
export const getDriverWithExtremeStat = (
  round: Round,
  stat: "birthday" | "heightCM" | "weightKG",
  extreme: "min" | "max",
  populatedDrivers: Map<string, driverType>,
): ObjectId | null => {
  let result: { id: ObjectId; value: number } | null = null

  for (const driverEntry of round.drivers) {
    const driverData = populatedDrivers.get(driverEntry.driver.toString())
    if (!driverData?.stats) continue

    let value: number
    if (stat === "birthday") {
      const birthday = driverData.stats.birthday
      if (!birthday) continue
      value = new Date(birthday).getTime()
    } else {
      const statValue = driverData.stats[stat]
      if (statValue === undefined || statValue === null) continue
      value = statValue
    }

    if (!result) {
      result = { id: driverEntry.driver, value }
    } else if ((extreme === "max" && value > result.value) || (extreme === "min" && value < result.value)) {
      result = { id: driverEntry.driver, value }
    }
  }

  return result?.id || null
}
