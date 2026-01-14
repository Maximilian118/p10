// Comeback and turnaround badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  didCompetitorWin,
  didScorePoints,
  isOnPodium,
  isLast,
  isLastRound,
  isRoundCompleted,
} from "../helpers"
import { createPointsAfterDryStreakChecker } from "../factories"

// Comeback/turnaround badge evaluators.
export const comebackEvaluators: [string, BadgeChecker][] = [
  // Points after dry streak badges - using factory for DRY code.
  ["Points After 3 Dry", createPointsAfterDryStreakChecker(3)],
  ["Points After 6 Dry", createPointsAfterDryStreakChecker(6)],
  ["Points After 9 Dry", createPointsAfterDryStreakChecker(9)],
  ["Points After 12 Dry", createPointsAfterDryStreakChecker(12)],
  [
    "Win After Last",
    (ctx) => {
      // Win after being last in previous round.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: isLast(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Podium to Last",
    (ctx) => {
      // Drop from podium to last place.
      if (!isLast(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: isOnPodium(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Last to Podium",
    (ctx) => {
      // Rise from last to podium.
      if (!isOnPodium(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: isLast(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Impossible Comeback",
    (ctx) => {
      // Win championship after being last at halfway point.
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      // Find halfway point.
      const completedRounds = ctx.allRounds.filter(isRoundCompleted)
      const halfwayIndex = Math.floor(completedRounds.length / 2) - 1
      if (halfwayIndex < 0) return { earned: false }

      const halfwayRound = ctx.allRounds[halfwayIndex]
      return { earned: isLast(halfwayRound, ctx.competitorId) }
    },
  ],
  [
    "Bottom to Top 5",
    (ctx) => {
      // Rise from bottom to top 5.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!currentEntry || currentEntry.position > 5) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!prevEntry) return { earned: false }

      const totalPrevCompetitors = prevRound.competitors.length
      return { earned: prevEntry.position > totalPrevCompetitors - 3 }
    },
  ],
  [
    "Top 5 to Bottom",
    (ctx) => {
      // Drop from top 5 to bottom.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!currentEntry) return { earned: false }

      const totalCurrentCompetitors = ctx.currentRound.competitors.length
      if (currentEntry.position <= totalCurrentCompetitors - 3) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      return { earned: prevEntry ? prevEntry.position <= 5 : false }
    },
  ],
  [
    "Survivor",
    (ctx) => {
      // Recover to top half after being last.
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!currentEntry) return { earned: false }
      const halfwayPosition = Math.ceil(ctx.currentRound.competitors.length / 2)
      if (currentEntry.position > halfwayPosition) return { earned: false }

      // Check if was ever last.
      for (let i = 0; i < ctx.currentRoundIndex; i++) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (isLast(round, ctx.competitorId)) return { earned: true }
      }
      return { earned: false }
    },
  ],
  [
    "Redemption Arc",
    (ctx) => {
      // Win after 10+ pointless rounds.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      let noPointsStreak = 0
      for (let i = ctx.currentRoundIndex - 1; i >= 0; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (!didScorePoints(round, ctx.competitorId)) {
          noPointsStreak++
        } else {
          break
        }
      }
      return { earned: noPointsStreak >= 10 }
    },
  ],
]
