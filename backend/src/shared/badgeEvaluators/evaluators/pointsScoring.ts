// Points and scoring pattern badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  getMaxPointsInRound,
  isRoundCompleted,
} from "../helpers"
import {
  createPointLeadChecker,
  createTiedPointsChecker,
  createPointsMilestoneChecker,
} from "../factories"

// Points/scoring pattern badge evaluators.
export const pointsScoringEvaluators: [string, BadgeChecker][] = [
  ["6 Point Lead", createPointLeadChecker(6)],
  ["12 Point Lead", createPointLeadChecker(12)],
  ["24 Point Lead", createPointLeadChecker(24)],
  ["Tied With 2", createTiedPointsChecker(2)],
  ["Tied With 3", createTiedPointsChecker(3)],
  ["Tied With 5", createTiedPointsChecker(5)],
  [
    "Even Points Streak",
    (ctx) => {
      // Have even total points for 4 consecutive rounds
      let streak = 0
      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 4; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry && entry.totalPoints % 2 === 0) {
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
  ["Double Digits", createPointsMilestoneChecker(10)],
  ["50 Points", createPointsMilestoneChecker(50)],
  ["100 Points", createPointsMilestoneChecker(100)],
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
      return { earned: points[0] > points[1] && points[1] > points[2] && points[2] >= 0 }
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
  ["25 Points", createPointsMilestoneChecker(25)],
  ["75 Points", createPointsMilestoneChecker(75)],
  ["150 Points", createPointsMilestoneChecker(150)],
  ["200 Points", createPointsMilestoneChecker(200)],
  ["18 Point Lead", createPointLeadChecker(18)],
  ["36 Point Lead", createPointLeadChecker(36)],
  [
    "25 Total Points",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry ? entry.totalPoints >= 25 : false }
    },
  ],
  [
    "Century Club",
    (ctx) => {
      // Accumulate 100+ points across all seasons
      let totalPoints = 0
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (currentEntry) totalPoints += currentEntry.totalPoints

      for (const season of ctx.champ.history || []) {
        const lastRound = season.rounds?.[season.rounds.length - 1]
        const entry = lastRound?.competitors?.find(
          (c) => c.competitor.toString() === ctx.competitorId.toString(),
        )
        if (entry) totalPoints += entry.totalPoints
      }
      return { earned: totalPoints >= 100 }
    },
  ],
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
  [
    "10+ Points in Round",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry ? entry.points >= 10 : false }
    },
  ],
]
