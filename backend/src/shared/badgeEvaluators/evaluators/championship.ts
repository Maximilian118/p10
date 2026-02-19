// Championship achievement badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  isLast,
  didPlaceBet,
  countWinsInSeason,
  getMaxPointsInRound,
  isLastRound,
  isRoundCompleted,
  getLastSeasonFinalEntry,
  hasMinimumCompetitors,
  MIN_COMPETITORS_PODIUM,
  MIN_COMPETITORS_TOP5,
  MIN_COMPETITORS_MIDDLE,
  MIN_COMPETITORS_RELEGATION,
} from "../helpers"

// Championship achievement badge evaluators (evaluated at season end).
export const championshipEvaluators: [string, BadgeChecker][] = [
  [
    "Championship Win",
    (ctx) => {
      // Win a championship (check if on last round and in 1st place).
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.position === 1 }
    },
  ],
  [
    "Championship Top 3",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_PODIUM)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry ? entry.position <= 3 : false }
    },
  ],
  [
    "Championship Top 5",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_TOP5)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry ? entry.position <= 5 : false }
    },
  ],
  [
    "Championship Last",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      return { earned: isLast(ctx.currentRound, ctx.competitorId) }
    },
  ],
  [
    "0 Points Entire Season",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.totalPoints === 0 }
    },
  ],
  [
    "Back-to-Back Champ",
    (ctx) => {
      // Win 2 championships in a row - check history.
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      // Check if they won previous season.
      const lastSeasonEntry = getLastSeasonFinalEntry(ctx)
      return { earned: lastSeasonEntry?.position === 1 }
    },
  ],
  [
    "Full Participation",
    (ctx) => {
      // Compete in every round of championship.
      if (!isLastRound(ctx)) return { earned: false }
      const completedRounds = ctx.allRounds.filter(isRoundCompleted)
      for (const round of completedRounds) {
        if (!didPlaceBet(round, ctx.competitorId)) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Improved Position",
    (ctx) => {
      // Finish higher than previous season.
      if (!isLastRound(ctx)) return { earned: false }
      if (!ctx.champ.history || ctx.champ.history.length === 0) return { earned: false }

      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }

      const lastSeason = ctx.champ.history[ctx.champ.history.length - 1]
      const lastSeasonFinalRound = lastSeason?.rounds?.[lastSeason.rounds.length - 1]
      const lastSeasonEntry = lastSeasonFinalRound?.competitors?.find(
        (c) => c.competitor.toString() === ctx.competitorId.toString(),
      )
      if (!lastSeasonEntry) return { earned: false }

      return { earned: entry.position < lastSeasonEntry.position }
    },
  ],
  [
    "Early Clinch",
    (ctx) => {
      // Clinch championship with 3+ rounds remaining
      const remainingRounds = ctx.allRounds.length - ctx.currentRoundIndex - 1
      if (remainingRounds < 3) return { earned: false }

      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }

      // Check if mathematically clinched
      const secondPlace = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!secondPlace) return { earned: false }

      const maxPointsPerRound = getMaxPointsInRound(ctx.champ.pointsStructure)
      const maxPossibleForSecond = secondPlace.totalPoints + remainingRounds * maxPointsPerRound
      return { earned: entry.totalPoints > maxPossibleForSecond }
    },
  ],
  [
    "Final Round Clinch",
    (ctx) => {
      // Win championship on final round
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      // Check if was not in 1st before this round
      if (ctx.currentRoundIndex === 0) return { earned: true }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      return { earned: prevEntry?.position !== 1 }
    },
  ],
  [
    "Won Title After Runner-Up",
    (ctx) => {
      // Win after being runner-up previous season
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      if (!ctx.champ.history || ctx.champ.history.length === 0) return { earned: false }
      const lastSeason = ctx.champ.history[ctx.champ.history.length - 1]
      const lastSeasonFinalRound = lastSeason?.rounds?.[lastSeason.rounds.length - 1]
      const lastSeasonEntry = lastSeasonFinalRound?.competitors?.find(
        (c) => c.competitor.toString() === ctx.competitorId.toString(),
      )
      return { earned: lastSeasonEntry?.position === 2 }
    },
  ],
  [
    "Half Round Wins",
    (ctx) => {
      // Win at least half of all rounds
      if (!isLastRound(ctx)) return { earned: false }
      const completedRounds = ctx.allRounds.filter(isRoundCompleted)
      const wins = countWinsInSeason(ctx.allRounds, ctx.competitorId)
      return { earned: wins >= Math.ceil(completedRounds.length / 2) }
    },
  ],
  // Additional championship badges
  [
    "Championship Runner-Up",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.position === 2 }
    },
  ],
  [
    "Championship Bronze",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.position === 3 }
    },
  ],
  [
    "Hat Trick Champ",
    (ctx) => {
      // Win 3 championships
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      let champWins = 1 // Current season
      for (const season of ctx.champ.history || []) {
        const lastRound = season.rounds?.[season.rounds.length - 1]
        const seasonEntry = lastRound?.competitors?.find(
          (c) => c.competitor.toString() === ctx.competitorId.toString(),
        )
        if (seasonEntry?.position === 1) champWins++
      }
      return { earned: champWins >= 3 }
    },
  ],
  [
    "Dynasty",
    (ctx) => {
      // Win 3 championships in a row
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      const history = ctx.champ.history || []
      if (history.length < 2) return { earned: false }

      // Check last 2 seasons
      for (let i = history.length - 1; i >= history.length - 2; i--) {
        const season = history[i]
        const lastRound = season?.rounds?.[season.rounds.length - 1]
        const seasonEntry = lastRound?.competitors?.find(
          (c) => c.competitor.toString() === ctx.competitorId.toString(),
        )
        if (seasonEntry?.position !== 1) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Top Half Finish",
    (ctx) => {
      // Finish in top half of championship standings at season end.
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_MIDDLE)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const halfwayPosition = Math.ceil(ctx.currentRound.competitors.length / 2)
      return { earned: entry.position <= halfwayPosition }
    },
  ],
  [
    "Bottom Half Finish",
    (ctx) => {
      // Finish in bottom half of championship standings at season end.
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_MIDDLE)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const halfwayPosition = Math.ceil(ctx.currentRound.competitors.length / 2)
      return { earned: entry.position > halfwayPosition }
    },
  ],
  [
    "Midpack Finish",
    (ctx) => {
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_MIDDLE)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const middlePosition = Math.ceil(ctx.currentRound.competitors.length / 2)
      return { earned: entry.position === middlePosition }
    },
  ],
  [
    "Relegated",
    (ctx) => {
      // Finish in relegation zone - bottom 3.
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_RELEGATION)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const totalCompetitors = ctx.currentRound.competitors.length
      return { earned: entry.position > totalCompetitors - 3 }
    },
  ],
  [
    "Survived Relegation",
    (ctx) => {
      // Avoid relegation after being in danger.
      if (!isLastRound(ctx)) return { earned: false }
      if (!hasMinimumCompetitors(ctx.currentRound, MIN_COMPETITORS_RELEGATION)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      const totalCompetitors = ctx.currentRound.competitors.length

      // Check if currently safe.
      if (entry.position > totalCompetitors - 3) return { earned: false }

      // Check if was in danger before.
      for (let i = ctx.currentRoundIndex - 1; i >= 0; i--) {
        const round = ctx.allRounds[i]
        if (round.status !== "completed" && round.status !== "results") continue
        const prevEntry = getCompetitorEntry(round, ctx.competitorId)
        if (prevEntry && prevEntry.position > round.competitors.length - 3) {
          return { earned: true }
        }
      }
      return { earned: false }
    },
  ],
  [
    "Title Defense",
    (ctx) => {
      // Successfully defend championship title
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      const history = ctx.champ.history || []
      if (history.length === 0) return { earned: false }

      const lastSeason = history[history.length - 1]
      const lastRound = lastSeason?.rounds?.[lastSeason.rounds.length - 1]
      const lastSeasonEntry = lastRound?.competitors?.find(
        (c) => c.competitor.toString() === ctx.competitorId.toString(),
      )
      return { earned: lastSeasonEntry?.position === 1 }
    },
  ],
  [
    "Consistent Top 5",
    (ctx) => {
      // Finish top 5 in 3 consecutive seasons
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position > 5) return { earned: false }

      const history = ctx.champ.history || []
      if (history.length < 2) return { earned: false }

      let consecutiveTop5 = 1
      for (let i = history.length - 1; i >= 0 && consecutiveTop5 < 3; i--) {
        const season = history[i]
        const lastRound = season?.rounds?.[season.rounds.length - 1]
        const seasonEntry = lastRound?.competitors?.find(
          (c) => c.competitor.toString() === ctx.competitorId.toString(),
        )
        if (seasonEntry && seasonEntry.position <= 5) {
          consecutiveTop5++
        } else {
          break
        }
      }
      return { earned: consecutiveTop5 >= 3 }
    },
  ],
  [
    "Wire-to-Wire Lead",
    (ctx) => {
      // Lead championship from round 1 to end
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (entry?.position !== 1) return { earned: false }

      // Check all rounds
      for (const round of ctx.allRounds) {
        if (round.status !== "completed" && round.status !== "results") continue
        const roundEntry = getCompetitorEntry(round, ctx.competitorId)
        if (!roundEntry || roundEntry.position !== 1) return { earned: false }
      }
      return { earned: true }
    },
  ],
]
