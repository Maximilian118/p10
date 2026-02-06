// Round performance badge evaluators.

import { BadgeChecker } from "../types"
import {
  didCompetitorWin,
  didCompetitorRunnerUp,
  isOnPodium,
  isInTopN,
  isLast,
  didScorePoints,
  didPlaceBet,
  getCompetitorEntry,
  getCompetitorBetDriver,
  hasMinimumCompetitors,
  hasMinimumCompletedRounds,
  MIN_COMPETITORS_PODIUM,
  MIN_COMPETITORS_TOP5,
  MIN_COMPETITORS_TOP7,
  MIN_COMPETITORS_TOP10,
  MIN_COMPETITORS_MIDDLE,
  MIN_ROUNDS_CUMULATIVE,
} from "../helpers"
import {
  createWinCountChecker,
  createRunnerUpCountChecker,
} from "../factories"

// Round performance badge evaluators.
export const roundPerformanceEvaluators: [string, BadgeChecker][] = [
  [
    "Round Win",
    (ctx) => ({
      earned: didCompetitorWin(ctx.currentRound, ctx.competitorId),
    }),
  ],
  [
    "Round Runner-Up",
    (ctx) => ({
      earned: didCompetitorRunnerUp(ctx.currentRound, ctx.competitorId),
    }),
  ],
  [
    "Round Podium",
    (ctx) => ({
      earned: hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_PODIUM)
        && isOnPodium(ctx.currentRound, ctx.competitorId),
    }),
  ],
  [
    "Round Top 5",
    (ctx) => ({
      earned: hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_TOP5)
        && isInTopN(ctx.currentRound, ctx.competitorId, 5),
    }),
  ],
  [
    "Round Last",
    (ctx) => ({
      earned: isLast(ctx.currentRound, ctx.competitorId),
    }),
  ],
  ["2 Round Wins", createWinCountChecker(2)],
  ["5 Round Wins", createWinCountChecker(5)],
  ["10 Round Wins", createWinCountChecker(10)],
  ["3x Runner-Up", createRunnerUpCountChecker(3)],
  ["5x Runner-Up", createRunnerUpCountChecker(5)],
  ["7x Runner-Up", createRunnerUpCountChecker(7)],
  [
    "First Round Win",
    (ctx) => ({
      earned: ctx.currentRoundIndex === 0 && didCompetitorWin(ctx.currentRound, ctx.competitorId),
    }),
  ],
  [
    "Final Round Win",
    (ctx) => {
      // Check if this is the last round of the championship
      const isLastRound = ctx.currentRoundIndex === ctx.allRounds.length - 1
      return { earned: isLastRound && didCompetitorWin(ctx.currentRound, ctx.competitorId) }
    },
  ],
  [
    "No Points",
    (ctx) => ({
      earned: didPlaceBet(ctx.currentRound, ctx.competitorId)
        && !didScorePoints(ctx.currentRound, ctx.competitorId),
    }),
  ],
  [
    "Perfect P10",
    (ctx) => {
      // Check if competitor won with exact P10 bet
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver?.positionActual === 10 }
    },
  ],
  [
    "First Win Ever",
    (ctx) => {
      // Check if this is competitor's first win ever in this championship
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      // Count wins before current round
      const previousWins = ctx.allRounds.slice(0, ctx.currentRoundIndex).filter(
        (r) => (r.status === "completed" || r.status === "results") && didCompetitorWin(r, ctx.competitorId),
      ).length
      return { earned: previousWins === 0 }
    },
  ],
  [
    "Won With P9 or P11",
    (ctx) => {
      // Win by betting on P9 or P11
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver?.positionActual === 9 || betDriver?.positionActual === 11 }
    },
  ],
  [
    "Large Field Win",
    (ctx) => {
      // Win with 10+ competitors betting
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const bettingCompetitors = ctx.currentRound.competitors.filter((c) => c.bet !== null).length
      return { earned: bettingCompetitors >= 10 }
    },
  ],
  [
    "Full Field Win",
    (ctx) => {
      // Win when all competitors are betting (everyone placed a bet).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const totalCompetitors = ctx.currentRound.competitors.length
      const bettingCompetitors = ctx.currentRound.competitors.filter((c) => c.bet !== null).length
      return { earned: bettingCompetitors === totalCompetitors && totalCompetitors > 1 }
    },
  ],
  [
    "Comeback Win",
    (ctx) => {
      // Win after being last in previous round.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (prevRound.status !== "completed" && prevRound.status !== "results") return { earned: false }
      return { earned: isLast(prevRound, ctx.competitorId) }
    },
  ],
  // Additional round performance badges
  [
    "Round Top 7",
    (ctx) => ({
      earned: hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_TOP7)
        && isInTopN(ctx.currentRound, ctx.competitorId, 7),
    }),
  ],
  [
    "Round Top 10",
    (ctx) => ({
      earned: hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_TOP10)
        && isInTopN(ctx.currentRound, ctx.competitorId, 10),
    }),
  ],
  ["3 Round Wins", createWinCountChecker(3)],
  ["7 Round Wins", createWinCountChecker(7)],
  ["15 Round Wins", createWinCountChecker(15)],
  ["20 Round Wins", createWinCountChecker(20)],
  [
    "First Podium",
    (ctx) => {
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_PODIUM)) return { earned: false }
      if (!isOnPodium(ctx.currentRound, ctx.competitorId)) return { earned: false }
      // Count podiums before current round.
      const previousPodiums = ctx.allRounds.slice(0, ctx.currentRoundIndex).filter(
        (r) => (r.status === "completed" || r.status === "results") && isOnPodium(r, ctx.competitorId),
      ).length
      return { earned: previousPodiums === 0 }
    },
  ],
  [
    "Round Middle",
    (ctx) => {
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_MIDDLE)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const totalCompetitors = ctx.currentRound.competitors.length
      const middlePosition = Math.ceil(totalCompetitors / 2)
      return { earned: entry.position === middlePosition }
    },
  ],
  [
    "Photo Finish",
    (ctx) => {
      // Win by tiebreaker - winner and runner-up have same total points in standings.
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const winner = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const runnerUp = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!winner || !runnerUp) return { earned: false }
      return { earned: winner.totalPoints === runnerUp.totalPoints }
    },
  ],
  [
    "Grid Penalty",
    (ctx) => {
      // Drop from position 1 to 5th or lower in one round.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (prevRound.status !== "completed" && prevRound.status !== "results") return { earned: false }

      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!prevEntry || !currentEntry) return { earned: false }

      return { earned: prevEntry.position === 1 && currentEntry.position >= 5 }
    },
  ],
  [
    "Undercut",
    (ctx) => {
      // Pass 3+ competitors in standings in one round.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (prevRound.status !== "completed" && prevRound.status !== "results") return { earned: false }

      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!prevEntry || !currentEntry) return { earned: false }

      const positionGain = prevEntry.position - currentEntry.position
      return { earned: positionGain >= 3 }
    },
  ],
  [
    "DRS Enabled",
    (ctx) => {
      // Win immediately after finishing P2.
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (prevRound.status !== "completed" && prevRound.status !== "results") return { earned: false }

      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      return { earned: prevEntry?.position === 2 }
    },
  ],
]
