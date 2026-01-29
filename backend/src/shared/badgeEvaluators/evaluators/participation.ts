// Participation and consistency badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  didPlaceBet,
  didCompetitorWin,
  isLastRound,
  isRoundCompleted,
} from "../helpers"
import { createNoBetStreakChecker, createRoundsPlayedChecker } from "../factories"

// Participation/consistency badge evaluators.
export const participationEvaluators: [string, BadgeChecker][] = [
  [
    "Joined Championship",
    (ctx) => {
      // Join a championship - awarded on first participation.
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry !== undefined }
    },
  ],
  // Rounds played milestones - using factory for DRY code.
  ["10 Rounds Played", createRoundsPlayedChecker(10)],
  ["25 Rounds Played", createRoundsPlayedChecker(25)],
  ["50 Rounds Played", createRoundsPlayedChecker(50)],
  ["100 Rounds Played", createRoundsPlayedChecker(100)],
  ["200 Rounds Played", createRoundsPlayedChecker(200)],
  ["500 Rounds Played", createRoundsPlayedChecker(500)],
  [
    "Missed Bet",
    (ctx) => ({
      earned: !didPlaceBet(ctx.currentRound, ctx.competitorId),
    }),
  ],
  ["3 Missed Bets", createNoBetStreakChecker(3)],
  ["5 Missed Bets", createNoBetStreakChecker(5)],
  ["7 Missed Bets", createNoBetStreakChecker(7)],
  ["10 Missed Bets", createNoBetStreakChecker(10)],
  [
    "Never Missed a Bet",
    (ctx) => {
      // Place bet in every round (same as Full Participation).
      if (!isLastRound(ctx)) return { earned: false }
      for (let i = 0; i <= ctx.currentRoundIndex; i++) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (!didPlaceBet(round, ctx.competitorId)) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Won After Joining Late",
    (ctx) => {
      // Win after joining mid-season
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      // Check if competitor was present in first round
      if (ctx.allRounds.length === 0) return { earned: false }
      const firstRound = ctx.allRounds[0]
      const wasInFirstRound = getCompetitorEntry(firstRound, ctx.competitorId) !== undefined
      return { earned: !wasInFirstRound }
    },
  ],
  [
    "Same Position 5 Rounds",
    (ctx) => {
      // Maintain same position for 5 consecutive rounds.
      if (ctx.currentRoundIndex < 4) return { earned: false }
      let position: number | null = null
      let streak = 0
      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 5; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry) break
        if (position === null) {
          position = entry.position
          streak = 1
        } else if (entry.position === position) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 5 }
    },
  ],
  // NOTE: Promoted/Demoted badges are awarded EXTERNALLY via admin actions,
  // not through badge evaluation in resultsHandler. These evaluators always
  // return false - the actual award happens in user role management code.
  [
    "Promoted",
    () => {
      // Awarded externally when adjudicator promotes a guest to competitor.
      // See: userResolvers.ts or champResolvers.ts promotion logic.
      return { earned: false }
    },
  ],
  [
    "Demoted",
    () => {
      // Awarded externally when adjudicator demotes a competitor to guest.
      // See: userResolvers.ts or champResolvers.ts demotion logic.
      return { earned: false }
    },
  ],
  [
    "Veteran",
    (ctx) => {
      // Compete in 5+ championships
      const seasonsParticipated = 1 + (ctx.champ.history?.filter((season) =>
        season.rounds?.some((round) => getCompetitorEntry(round, ctx.competitorId) !== undefined),
      ).length || 0)
      return { earned: seasonsParticipated >= 5 }
    },
  ],
  [
    "Legend",
    (ctx) => {
      // Compete in 10+ championships
      const seasonsParticipated = 1 + (ctx.champ.history?.filter((season) =>
        season.rounds?.some((round) => getCompetitorEntry(round, ctx.competitorId) !== undefined),
      ).length || 0)
      return { earned: seasonsParticipated >= 10 }
    },
  ],
  [
    "Founding Member",
    (ctx) => {
      // Compete in first season of championship
      const history = ctx.champ.history || []
      if (history.length === 0) {
        // This is the first season
        const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
        return { earned: entry !== undefined }
      }
      // Check first season in history
      const firstSeason = history[0]
      const wasInFirst = firstSeason?.rounds?.some(
        (round) => getCompetitorEntry(round, ctx.competitorId) !== undefined,
      )
      return { earned: wasInFirst || false }
    },
  ],
  [
    "Season Regular",
    (ctx) => {
      // Compete in at least 75% of rounds in a season.
      if (!isLastRound(ctx)) return { earned: false }
      const completedRounds = ctx.allRounds.filter(isRoundCompleted)
      let roundsParticipated = 0
      for (const round of completedRounds) {
        if (didPlaceBet(round, ctx.competitorId)) roundsParticipated++
      }
      return { earned: roundsParticipated >= completedRounds.length * 0.75 }
    },
  ],
  [
    "Never Missed 3 Seasons",
    (ctx) => {
      // Never miss a bet in 3 consecutive seasons.
      if (!isLastRound(ctx)) return { earned: false }

      // Check current season.
      for (const round of ctx.allRounds) {
        if (!isRoundCompleted(round)) continue
        if (!didPlaceBet(round, ctx.competitorId)) return { earned: false }
      }

      // Check previous 2 seasons.
      const history = ctx.champ.history || []
      if (history.length < 2) return { earned: false }

      for (let i = history.length - 1; i >= history.length - 2; i--) {
        const season = history[i]
        for (const round of season.rounds || []) {
          if (round.status !== "completed") continue
          if (!didPlaceBet(round, ctx.competitorId)) return { earned: false }
        }
      }
      return { earned: true }
    },
  ],
  [
    "Points Penalty",
    (ctx) => {
      // Receive a negative points adjustment from the adjudicator.
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      // Check if any adjustment in the array is negative.
      const adjustments = entry.adjustment
      if (!adjustments || !Array.isArray(adjustments)) return { earned: false }
      return { earned: adjustments.some((adj) => adj.adjustment < 0) }
    },
  ],
  [
    "Consistency King",
    (ctx) => {
      // Finish in the same position for 3 rounds in a row.
      if (ctx.currentRoundIndex < 2) return { earned: false }

      let position: number | null = null
      let streak = 0

      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry) break

        if (position === null) {
          position = entry.position
          streak = 1
        } else if (entry.position === position) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 3 }
    },
  ],
]
