// Points and scoring pattern badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  getMaxPointsInRound,
  isRoundCompleted,
  hasMinimumCompletedRounds,
  MIN_ROUNDS_CUMULATIVE,
} from "../helpers"
import {
  createTiedPointsChecker,
  createSeasonPercentageChecker,
  createPercentageLeadChecker,
  createCareerPercentageChecker,
  createRoundPercentageChecker,
} from "../factories"

// Points/scoring pattern badge evaluators.
export const pointsScoringEvaluators: [string, BadgeChecker][] = [
  // Point lead badges (percentage of max round points).
  ["25% Lead", createPercentageLeadChecker(25)],
  ["50% Lead", createPercentageLeadChecker(50)],
  ["100% Lead", createPercentageLeadChecker(100)],
  ["Tied With 2", createTiedPointsChecker(2)],
  ["Tied With 3", createTiedPointsChecker(3)],
  ["Tied With 5", createTiedPointsChecker(5)],
  [
    "Even Points Streak",
    (ctx) => {
      // Have even total points for 4 consecutive rounds (0 doesn't count as even).
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
      let streak = 0
      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 4; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry && entry.totalPoints > 0 && entry.totalPoints % 2 === 0) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 4 }
    },
  ],
  [
    "Odd Points Streak",
    (ctx) => {
      // Have odd total points for 4 consecutive rounds
      let streak = 0
      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 4; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry && entry.totalPoints % 2 !== 0) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 4 }
    },
  ],
  // Season milestone badges (percentage of total earnable season points).
  ["Season 5%", createSeasonPercentageChecker(5)],
  ["Season 20%", createSeasonPercentageChecker(20)],
  ["Season 50%", createSeasonPercentageChecker(50)],
  [
    "Max Round Points",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const maxPoints = getMaxPointsInRound(ctx.champ.pointsStructure)
      return { earned: entry.points === maxPoints && maxPoints > 0 }
    },
  ],
  [
    "Zero After 10 Rounds",
    (ctx) => {
      // Have zero points after 10 rounds
      if (ctx.currentRoundIndex < 9) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.totalPoints === 0 }
    },
  ],
  [
    "Same Points x3",
    (ctx) => {
      // Score same points in 3 consecutive rounds
      if (ctx.currentRoundIndex < 2) return { earned: false }
      const points: number[] = []
      for (let i = ctx.currentRoundIndex; i >= 0 && points.length < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry) points.push(entry.points)
      }
      if (points.length < 3) return { earned: false }
      return { earned: points[0] === points[1] && points[1] === points[2] }
    },
  ],
  [
    "Ascending Points",
    (ctx) => {
      // Score ascending points for 3 rounds
      if (ctx.currentRoundIndex < 2) return { earned: false }
      const points: number[] = []
      for (let i = ctx.currentRoundIndex; i >= 0 && points.length < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry) points.unshift(entry.points)
      }
      if (points.length < 3) return { earned: false }
      return { earned: points[0] < points[1] && points[1] < points[2] && points[0] > 0 }
    },
  ],
  [
    "Descending Points",
    (ctx) => {
      // Score descending points for 3 rounds
      if (ctx.currentRoundIndex < 2) return { earned: false }
      const points: number[] = []
      for (let i = ctx.currentRoundIndex; i >= 0 && points.length < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry) points.unshift(entry.points)
      }
      if (points.length < 3) return { earned: false }
      return { earned: points[0] > points[1] && points[1] > points[2] && points[2] > 0 }
    },
  ],
  // Additional points/scoring badges
  [
    "Single Point",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.points === 1 }
    },
  ],
  [
    "Two Points",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.points === 2 }
    },
  ],
  [
    "Five Points",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.points === 5 }
    },
  ],
  ["Season 10%", createSeasonPercentageChecker(10)],
  ["Season 33%", createSeasonPercentageChecker(33)],
  ["Season 66%", createSeasonPercentageChecker(66)],
  ["Season 80%", createSeasonPercentageChecker(80)],
  ["Season 95%", createSeasonPercentageChecker(95)],
  ["75% Lead", createPercentageLeadChecker(75)],
  ["150% Lead", createPercentageLeadChecker(150)],
  // Career badges (percentage of total career earnable points).
  ["Career 33%", createCareerPercentageChecker(33)],
  ["Career 50%", createCareerPercentageChecker(50)],
  [
    "Tied For Lead",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }
      // Check if there's another competitor with same totalPoints
      const tiedWithFirst = ctx.currentRound.competitors.filter(
        (c) => c.totalPoints === entry.totalPoints && c.competitor.toString() !== ctx.competitorId.toString(),
      ).length
      return { earned: tiedWithFirst > 0 }
    },
  ],
  // Per-round badge (percentage of max round points).
  ["60% Round Points", createRoundPercentageChecker(60)],
]
