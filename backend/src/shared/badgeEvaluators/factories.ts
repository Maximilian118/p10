// Badge checker factory functions for DRY evaluation patterns.

import { BadgeChecker, BadgeContext } from "./types"
import { driverType } from "../../models/driver"
import {
  countWinsInSeason,
  countRunnerUpsInSeason,
  countTotalRoundsPlayed,
  didCompetitorWin,
  didScorePoints,
  getCompetitorEntry,
  getDriverWithExtremeStat,
  getMaxPointsInRound,
  getNoBetStreak,
  getStreakLength,
} from "./helpers"

// Factory: Check if competitor won N rounds in season.
export const createWinCountChecker = (targetWins: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const wins = countWinsInSeason(ctx.allRounds, ctx.competitorId)
    return { earned: wins >= targetWins }
  }
}

// Factory: Check win streak of N rounds.
export const createWinStreakChecker = (streakLength: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const streak = getStreakLength(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, didCompetitorWin)
    return { earned: streak >= streakLength }
  }
}

// Factory: Check points streak of N rounds.
export const createPointsStreakChecker = (streakLength: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const streak = getStreakLength(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, didScorePoints)
    return { earned: streak >= streakLength }
  }
}

// Factory: Check no-points streak of N rounds.
export const createNoPointsStreakChecker = (streakLength: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const streak = getStreakLength(
      ctx.allRounds,
      ctx.competitorId,
      ctx.currentRoundIndex,
      (round, compId) => !didScorePoints(round, compId),
    )
    return { earned: streak >= streakLength }
  }
}

// Factory: Check point lead of N points.
export const createPointLeadChecker = (leadAmount: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry || entry.position !== 1) return { earned: false }

    const secondPlace = ctx.currentRound.competitors.find((c) => c.position === 2)
    if (!secondPlace) return { earned: false }

    const lead = entry.totalPoints - secondPlace.totalPoints
    return { earned: lead >= leadAmount }
  }
}

// Factory: Check runner-up count.
export const createRunnerUpCountChecker = (targetCount: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const count = countRunnerUpsInSeason(ctx.allRounds, ctx.competitorId)
    return { earned: count >= targetCount }
  }
}

// Factory: Check tied points with N others.
export const createTiedPointsChecker = (tiedWith: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry || entry.totalPoints === 0) return { earned: false }

    const samePointsCount = ctx.currentRound.competitors.filter(
      (c) => c.totalPoints === entry.totalPoints && c.competitor.toString() !== ctx.competitorId.toString(),
    ).length

    return { earned: samePointsCount >= tiedWith }
  }
}

// Factory: Check no-bet streak of N rounds.
export const createNoBetStreakChecker = (streakLength: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const streak = getNoBetStreak(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex)
    return { earned: streak >= streakLength }
  }
}

// Factory: Check points milestone reached (LEGACY — use percentage-based checkers instead).
export const createPointsMilestoneChecker = (milestone: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    return { earned: entry ? entry.totalPoints >= milestone : false }
  }
}

// Factory: Check season points as percentage of total earnable (maxPerRound × totalRounds).
export const createSeasonPercentageChecker = (percentage: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry) return { earned: false }
    const maxPerRound = getMaxPointsInRound(ctx.champ.pointsStructure)
    const totalEarnable = maxPerRound * ctx.allRounds.length
    if (totalEarnable === 0) return { earned: false }
    return { earned: entry.totalPoints >= (percentage / 100) * totalEarnable }
  }
}

// Factory: Check point lead as percentage of max round points.
export const createPercentageLeadChecker = (percentage: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry || entry.position !== 1) return { earned: false }
    const secondPlace = ctx.currentRound.competitors.find((c) => c.position === 2)
    if (!secondPlace) return { earned: false }
    const maxPerRound = getMaxPointsInRound(ctx.champ.pointsStructure)
    if (maxPerRound === 0) return { earned: false }
    const requiredLead = (percentage / 100) * maxPerRound
    const lead = entry.totalPoints - secondPlace.totalPoints
    return { earned: lead >= requiredLead }
  }
}

// Factory: Check career points as percentage of total career earnable.
// Uses current season's structure × total career rounds played as denominator.
export const createCareerPercentageChecker = (percentage: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const maxPerRound = getMaxPointsInRound(ctx.champ.pointsStructure)
    const totalCareerRounds = countTotalRoundsPlayed(ctx)
    const careerEarnable = maxPerRound * totalCareerRounds
    if (careerEarnable === 0) return { earned: false }
    // Sum career points across all seasons.
    let totalCareerPoints = 0
    const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (currentEntry) totalCareerPoints += currentEntry.totalPoints
    for (const season of ctx.champ.history || []) {
      const lastRound = season.rounds?.[season.rounds.length - 1]
      const entry = lastRound?.competitors?.find(
        (c) => c.competitor.toString() === ctx.competitorId.toString(),
      )
      if (entry) totalCareerPoints += entry.totalPoints
    }
    return { earned: totalCareerPoints >= (percentage / 100) * careerEarnable }
  }
}

// Factory: Check single-round points as percentage of max round points.
export const createRoundPercentageChecker = (percentage: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry) return { earned: false }
    const maxPerRound = getMaxPointsInRound(ctx.champ.pointsStructure)
    if (maxPerRound === 0) return { earned: false }
    return { earned: entry.points >= (percentage / 100) * maxPerRound }
  }
}

// Factory: Check total rounds played (including history).
export const createRoundsPlayedChecker = (targetRounds: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    const count = countTotalRoundsPlayed(ctx)
    return { earned: count >= targetRounds }
  }
}

// Factory: Check points scored after N dry rounds.
export const createPointsAfterDryStreakChecker = (dryRounds: number): BadgeChecker => {
  return (ctx: BadgeContext) => {
    if (!didScorePoints(ctx.currentRound, ctx.competitorId)) return { earned: false }
    let noPointsStreak = 0
    for (let i = ctx.currentRoundIndex - 1; i >= 0; i--) {
      const round = ctx.allRounds[i]
      if (round.status !== "completed" && round.status !== "results") continue
      if (!didScorePoints(round, ctx.competitorId)) {
        noPointsStreak++
      } else {
        break
      }
    }
    return { earned: noPointsStreak >= dryRounds }
  }
}

// Factory: Check win with driver having extreme stat (oldest, youngest, tallest, etc.).
export const createExtremeStatWinChecker = (
  stat: "birthday" | "heightCM" | "weightKG",
  extreme: "min" | "max",
): BadgeChecker => {
  return (ctx: BadgeContext, populatedDrivers?: Map<string, driverType>) => {
    if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
    if (!populatedDrivers) return { earned: false }
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry?.bet) return { earned: false }
    const extremeDriverId = getDriverWithExtremeStat(ctx.currentRound, stat, extreme, populatedDrivers)
    return { earned: extremeDriverId?.toString() === entry.bet.toString() }
  }
}

// Factory: Check win with driver having a specific feature (moustache, mullet, both).
export const createDriverFeatureWinChecker = (
  feature: "moustache" | "mullet" | "both",
): BadgeChecker => {
  return (ctx: BadgeContext, populatedDrivers?: Map<string, driverType>) => {
    if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
    if (!populatedDrivers) return { earned: false }
    const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
    if (!entry?.bet) return { earned: false }
    const driver = populatedDrivers.get(entry.bet.toString())
    if (!driver?.stats) return { earned: false }
    if (feature === "both") {
      return { earned: driver.stats.moustache === true && driver.stats.mullet === true }
    }
    return { earned: driver.stats[feature] === true }
  }
}
