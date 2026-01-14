// Streak badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  didCompetitorWin,
  didScorePoints,
  isOnPodium,
  isInTopN,
  getStreakLength,
  isLastRound,
  isRoundCompleted,
} from "../helpers"
import {
  createWinStreakChecker,
  createPointsStreakChecker,
  createNoPointsStreakChecker,
} from "../factories"

// Streak badge evaluators.
export const streaksEvaluators: [string, BadgeChecker][] = [
  ["2 Win Streak", createWinStreakChecker(2)],
  ["3 Win Streak", createWinStreakChecker(3)],
  ["5 Win Streak", createWinStreakChecker(5)],
  ["6 Points Streak", createPointsStreakChecker(6)],
  ["10 Points Streak", createPointsStreakChecker(10)],
  [
    "Full Points Streak",
    (ctx) => {
      // Score points in every round of championship
      if (!isLastRound(ctx)) return { earned: false }
      for (let i = 0; i <= ctx.currentRoundIndex; i++) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (!didScorePoints(round, ctx.competitorId)) return { earned: false }
      }
      return { earned: true }
    },
  ],
  ["3 No Points Streak", createNoPointsStreakChecker(3)],
  ["5 No Points Streak", createNoPointsStreakChecker(5)],
  [
    "Same Driver Points x2",
    (ctx) => {
      // Score points with same driver 2 times in a row
      if (ctx.currentRoundIndex < 1) return { earned: false }
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!currentEntry?.bet || currentEntry.points === 0) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!prevEntry?.bet || prevEntry.points === 0) return { earned: false }

      return { earned: currentEntry.bet.toString() === prevEntry.bet.toString() }
    },
  ],
  [
    "Same Driver Points x4",
    (ctx) => {
      if (ctx.currentRoundIndex < 3) return { earned: false }
      let streak = 0
      let lastDriverId: string | null = null

      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 4; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet || entry.points === 0) break

        const driverId = entry.bet.toString()
        if (lastDriverId === null) {
          lastDriverId = driverId
          streak = 1
        } else if (driverId === lastDriverId) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 4 }
    },
  ],
  [
    "Same Driver Win x2",
    (ctx) => {
      if (ctx.currentRoundIndex < 1) return { earned: false }
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!currentEntry?.bet) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      if (!didCompetitorWin(prevRound, ctx.competitorId)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!prevEntry?.bet) return { earned: false }

      return { earned: currentEntry.bet.toString() === prevEntry.bet.toString() }
    },
  ],
  [
    "Same Driver Win x4",
    (ctx) => {
      if (ctx.currentRoundIndex < 3) return { earned: false }
      let streak = 0
      let lastDriverId: string | null = null

      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 4; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (!didCompetitorWin(round, ctx.competitorId)) break
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet) break

        const driverId = entry.bet.toString()
        if (lastDriverId === null) {
          lastDriverId = driverId
          streak = 1
        } else if (driverId === lastDriverId) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 4 }
    },
  ],
  // Additional streak badges
  ["4 Win Streak", createWinStreakChecker(4)],
  ["7 Win Streak", createWinStreakChecker(7)],
  ["8 Points Streak", createPointsStreakChecker(8)],
  ["15 Points Streak", createPointsStreakChecker(15)],
  ["4 No Points Streak", createNoPointsStreakChecker(4)],
  ["7 No Points Streak", createNoPointsStreakChecker(7)],
  ["10 No Points Streak", createNoPointsStreakChecker(10)],
  [
    "Podium Streak x2",
    (ctx) => {
      const streak = getStreakLength(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, isOnPodium)
      return { earned: streak >= 2 }
    },
  ],
  [
    "Podium Streak x3",
    (ctx) => {
      const streak = getStreakLength(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, isOnPodium)
      return { earned: streak >= 3 }
    },
  ],
  [
    "Podium Streak x5",
    (ctx) => {
      const streak = getStreakLength(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, isOnPodium)
      return { earned: streak >= 5 }
    },
  ],
  [
    "Top 5 Streak x5",
    (ctx) => {
      const streak = getStreakLength(
        ctx.allRounds,
        ctx.competitorId,
        ctx.currentRoundIndex,
        (round, compId) => isInTopN(round, compId, 5),
      )
      return { earned: streak >= 5 }
    },
  ],
  [
    "Top 5 Streak x10",
    (ctx) => {
      const streak = getStreakLength(
        ctx.allRounds,
        ctx.competitorId,
        ctx.currentRoundIndex,
        (round, compId) => isInTopN(round, compId, 5),
      )
      return { earned: streak >= 10 }
    },
  ],
  [
    "Same Driver Points x3",
    (ctx) => {
      if (ctx.currentRoundIndex < 2) return { earned: false }
      let streak = 0
      let lastDriverId: string | null = null

      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet || entry.points === 0) break

        const driverId = entry.bet.toString()
        if (lastDriverId === null) {
          lastDriverId = driverId
          streak = 1
        } else if (driverId === lastDriverId) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 3 }
    },
  ],
  [
    "Same Driver Win x3",
    (ctx) => {
      if (ctx.currentRoundIndex < 2) return { earned: false }
      let streak = 0
      let lastDriverId: string | null = null

      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (!didCompetitorWin(round, ctx.competitorId)) break
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet) break

        const driverId = entry.bet.toString()
        if (lastDriverId === null) {
          lastDriverId = driverId
          streak = 1
        } else if (driverId === lastDriverId) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 3 }
    },
  ],
]
