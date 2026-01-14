// Fun and quirky badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  getCompetitorBetDriver,
  didCompetitorWin,
  didCompetitorRunnerUp,
  didScorePoints,
  didPlaceBet,
  isLast,
  getStreakLength,
  countRunnerUpsInSeason,
  isLastRound,
  isRoundCompleted,
} from "../helpers"

// Fun/quirky badge evaluators.
export const quirkyEvaluators: [string, BadgeChecker][] = [
  [
    "Triple Zero",
    (ctx) => {
      // Score 0 points three rounds in a row
      const streak = getStreakLength(
        ctx.allRounds,
        ctx.competitorId,
        ctx.currentRoundIndex,
        (round, compId) => {
          const entry = getCompetitorEntry(round, compId)
          return entry?.points === 0
        },
      )
      return { earned: streak >= 3 }
    },
  ],
  [
    "Only One to Score",
    (ctx) => {
      // Be the only competitor to score points in a round
      if (!didScorePoints(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const othersScoredPoints = ctx.currentRound.competitors.filter(
        (c) => c.competitor.toString() !== ctx.competitorId.toString() && c.points > 0,
      ).length
      return { earned: othersScoredPoints === 0 }
    },
  ],
  [
    "Won After Scoring Zero",
    (ctx) => {
      // Win despite scoring 0 in the previous round
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      return { earned: prevEntry?.points === 0 }
    },
  ],
  [
    "Lost by 1 Point",
    (ctx) => {
      // Lose by 1 point (runner-up with 1 point less than winner)
      if (!didCompetitorRunnerUp(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const winner = ctx.currentRound.competitors.find((c) => c.position === 1)
      if (!entry || !winner) return { earned: false }
      return { earned: winner.totalPoints - entry.totalPoints === 1 }
    },
  ],
  [
    "Won by 1 Point",
    (ctx) => {
      // Win by 1 point
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const runnerUp = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!entry || !runnerUp) return { earned: false }
      return { earned: entry.totalPoints - runnerUp.totalPoints === 1 }
    },
  ],
  [
    "Won From Last Place",
    (ctx) => {
      // Win as the underdog (lowest in standings before this round).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: isLast(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Beat Leader From Last",
    (ctx) => {
      // Beat the standings leader when in last place
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }

      // Was in last place
      if (!isLast(prevRound, ctx.competitorId)) return { earned: false }

      // Check if previous leader dropped positions
      const prevLeader = prevRound.competitors.find((c) => c.position === 1)
      if (!prevLeader) return { earned: false }

      const currentLeaderEntry = getCompetitorEntry(ctx.currentRound, prevLeader.competitor)
      return { earned: currentLeaderEntry ? currentLeaderEntry.position > 1 : false }
    },
  ],
  [
    "All or Nothing",
    (ctx) => {
      // Experience both extremes - have won at least once AND finished last at least once.
      let hasWon = false
      let hasFinishedLast = false

      for (let i = 0; i <= ctx.currentRoundIndex; i++) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        if (didCompetitorWin(round, ctx.competitorId)) hasWon = true
        if (isLast(round, ctx.competitorId)) hasFinishedLast = true
        if (hasWon && hasFinishedLast) break
      }
      return { earned: hasWon && hasFinishedLast }
    },
  ],
  [
    "Participation Trophy",
    (ctx) => {
      // Finish last with some points
      if (!isLast(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry ? entry.totalPoints > 0 : false }
    },
  ],
  [
    "Absolute Zero",
    (ctx) => {
      // Finish last with zero points
      if (!isLast(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.totalPoints === 0 }
    },
  ],
  [
    "Bet on P9 or P11",
    (ctx) => {
      // Bet on P11 or P9 (one off from P10)
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver?.positionActual === 9 || betDriver?.positionActual === 11 }
    },
  ],
  // Creative & Funny badges
  [
    "Everyone Scored Except You",
    (ctx) => {
      // Score 0 when all other competitors scored
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.points > 0) return { earned: false }
      const othersScoredPoints = ctx.currentRound.competitors.filter(
        (c) => c.competitor.toString() !== ctx.competitorId.toString() && c.points > 0,
      ).length
      const othersCount = ctx.currentRound.competitors.length - 1
      return { earned: othersScoredPoints === othersCount && othersCount > 0 }
    },
  ],
  [
    "Nice",
    (ctx) => {
      // Have exactly 69 total points
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      return { earned: entry?.totalPoints === 69 }
    },
  ],
  [
    "Runner-Up 5x in Season",
    (ctx) => {
      // Finish second place 5 times in one season
      const count = countRunnerUpsInSeason(ctx.allRounds, ctx.competitorId)
      return { earned: count >= 5 }
    },
  ],
  [
    "1st to Last in One Round",
    (ctx) => {
      // Go from 1st place to last in a single round
      if (ctx.currentRoundIndex === 0) return { earned: false }
      if (!isLast(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      return { earned: prevEntry?.position === 1 }
    },
  ],
  [
    "Last to 1st in One Round",
    (ctx) => {
      // Go from last place to 1st in a single round
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: isLast(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Lost Title After Winning",
    (ctx) => {
      // Lose championship after winning previous season
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position === 1) return { earned: false }

      if (!ctx.champ.history || ctx.champ.history.length === 0) return { earned: false }
      const lastSeason = ctx.champ.history[ctx.champ.history.length - 1]
      const lastSeasonFinalRound = lastSeason?.rounds?.[lastSeason.rounds.length - 1]
      const lastSeasonEntry = lastSeasonFinalRound?.competitors?.find(
        (c) => c.competitor.toString() === ctx.competitorId.toString(),
      )
      return { earned: lastSeasonEntry?.position === 1 }
    },
  ],
  [
    "DNF Twice in a Row",
    (ctx) => {
      // Bet on a driver who DNFs in two consecutive rounds
      if (ctx.currentRoundIndex < 1) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      if (!betDriver || (betDriver.positionActual !== 0 && betDriver.positionActual < 21)) return { earned: false }

      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      const prevBetDriver = getCompetitorBetDriver(prevRound, ctx.competitorId)
      if (!prevBetDriver) return { earned: false }
      return { earned: prevBetDriver.positionActual === 0 || prevBetDriver.positionActual >= 21 }
    },
  ],
  [
    "Never Same Driver Twice",
    (ctx) => {
      // Never bet same driver consecutively for 10+ rounds
      if (ctx.currentRoundIndex < 9) return { earned: false }
      let lastDriverId: string | null = null
      let roundsCounted = 0

      for (let i = ctx.currentRoundIndex; i >= 0 && roundsCounted < 10; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet) return { earned: false }

        const currentDriverId = entry.bet.toString()
        if (lastDriverId !== null && currentDriverId === lastDriverId) {
          return { earned: false }
        }
        lastDriverId = currentDriverId
        roundsCounted++
      }
      return { earned: roundsCounted >= 10 }
    },
  ],
  [
    "Championship Won by 1 Point",
    (ctx) => {
      // Win championship with just 1 point margin
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }
      const runnerUp = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!runnerUp) return { earned: false }
      return { earned: entry.totalPoints - runnerUp.totalPoints === 1 }
    },
  ],
  [
    "Championship Won by 30+ Points",
    (ctx) => {
      // Win championship with 30+ point margin
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }
      const runnerUp = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!runnerUp) return { earned: false }
      return { earned: entry.totalPoints - runnerUp.totalPoints >= 30 }
    },
  ],
  [
    "First Championship After 5+ Seasons",
    (ctx) => {
      // First title win after competing 5+ seasons
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }

      const history = ctx.champ.history || []
      if (history.length < 4) return { earned: false }

      // Count seasons participated (excluding current)
      let seasonsParticipated = 0
      let previousWins = 0
      for (const season of history) {
        const wasInSeason = season.rounds?.some(
          (round) => getCompetitorEntry(round, ctx.competitorId) !== undefined,
        )
        if (wasInSeason) {
          seasonsParticipated++
          const lastRound = season.rounds?.[season.rounds.length - 1]
          const seasonEntry = lastRound?.competitors?.find(
            (c) => c.competitor.toString() === ctx.competitorId.toString(),
          )
          if (seasonEntry?.position === 1) previousWins++
        }
      }
      return { earned: seasonsParticipated >= 4 && previousWins === 0 }
    },
  ],
  [
    "Missed Entire Season",
    (ctx) => {
      // Miss every bet in a championship
      if (!isLastRound(ctx)) return { earned: false }
      for (const round of ctx.allRounds) {
        if (!isRoundCompleted(round)) continue
        if (didPlaceBet(round, ctx.competitorId)) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Same Driver All Season",
    (ctx) => {
      // Bet on same driver for entire championship
      if (!isLastRound(ctx)) return { earned: false }

      let firstDriverId: string | null = null
      let roundsWithBets = 0

      for (const round of ctx.allRounds) {
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (!entry?.bet) continue
        roundsWithBets++

        const driverId = entry.bet.toString()
        if (firstDriverId === null) {
          firstDriverId = driverId
        } else if (driverId !== firstDriverId) {
          return { earned: false }
        }
      }
      return { earned: roundsWithBets >= 5 && firstDriverId !== null }
    },
  ],
  [
    "Won Championship First Season",
    (ctx) => {
      // Win championship in your debut season
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 1) return { earned: false }

      // Check if competitor was in any previous season
      for (const season of ctx.champ.history || []) {
        const wasInSeason = season.rounds?.some(
          (round) => getCompetitorEntry(round, ctx.competitorId) !== undefined,
        )
        if (wasInSeason) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Always Bridesmaid Never Bride",
    (ctx) => {
      // Finish runner-up in 3 consecutive seasons
      if (!isLastRound(ctx)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry || entry.position !== 2) return { earned: false }

      const history = ctx.champ.history || []
      if (history.length < 2) return { earned: false }

      // Check last 2 seasons for runner-up
      for (let i = history.length - 1; i >= history.length - 2; i--) {
        const season = history[i]
        const lastRound = season?.rounds?.[season.rounds.length - 1]
        const seasonEntry = lastRound?.competitors?.find(
          (c) => c.competitor.toString() === ctx.competitorId.toString(),
        )
        if (seasonEntry?.position !== 2) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Dropped 5+ Positions",
    (ctx) => {
      // Drop 5+ positions in standings in one round.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }

      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!currentEntry || !prevEntry) return { earned: false }

      const drop = currentEntry.position - prevEntry.position
      return { earned: drop >= 5 }
    },
  ],
  [
    "Gained 5+ Positions",
    (ctx) => {
      // Gain 5+ positions in standings in one round.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }

      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!currentEntry || !prevEntry) return { earned: false }

      const gain = prevEntry.position - currentEntry.position
      return { earned: gain >= 5 }
    },
  ],
]
