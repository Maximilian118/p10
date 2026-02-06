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
  hasMinimumCompletedRounds,
  didBetAndScoreZero,
  MIN_ROUNDS_CUMULATIVE,
  MIN_COMPETITORS_LONE_WOLF,
} from "../helpers"

// Fun/quirky badge evaluators.
export const quirkyEvaluators: [string, BadgeChecker][] = [
  [
    "Triple Zero",
    (ctx) => {
      // Score 0 points three rounds in a row (must have placed bets, not just missed them).
      const streak = getStreakLength(
        ctx.allRounds,
        ctx.competitorId,
        ctx.currentRoundIndex,
        (round, compId) => didBetAndScoreZero(round, compId),
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
      // Win despite scoring 0 in the previous round (must have bet, not just missed).
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }
      return { earned: didBetAndScoreZero(prevRound, ctx.competitorId) }
    },
  ],
  [
    "Lost by 1 Point",
    (ctx) => {
      // Lose by 1 point (runner-up with 1 point less than winner).
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
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
      // Win by 1 point.
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const runnerUp = ctx.currentRound.competitors.find((c) => c.position === 2)
      if (!entry || !runnerUp) return { earned: false }
      return { earned: entry.totalPoints - runnerUp.totalPoints === 1 }
    },
  ],
  [
    "Beat Leader From Last",
    (ctx) => {
      // Beat the standings leader when in last place.
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
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
      // Finish last with zero points.
      if (!hasMinimumCompletedRounds(ctx, MIN_ROUNDS_CUMULATIVE)) return { earned: false }
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
  [
    "Lucky Number",
    (ctx) => {
      // Have exactly 7, 13, or 21 total points.
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const luckyNumbers = [7, 13, 21]
      return { earned: entry ? luckyNumbers.includes(entry.totalPoints) : false }
    },
  ],
  [
    "Trendsetter",
    (ctx) => {
      // 3+ other competitors also bet on the same driver as you.
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      const betDriverId = entry.bet.toString()
      const othersWithSameBet = ctx.currentRound.competitors.filter(
        (c) => c.competitor.toString() !== ctx.competitorId.toString() && c.bet?.toString() === betDriverId,
      ).length

      return { earned: othersWithSameBet >= 3 }
    },
  ],
  [
    "Overcut",
    (ctx) => {
      // Get passed by 3+ competitors in standings in one round.
      if (ctx.currentRoundIndex === 0) return { earned: false }
      const prevRound = ctx.allRounds[ctx.currentRoundIndex - 1]
      if (!isRoundCompleted(prevRound)) return { earned: false }

      const currentEntry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      const prevEntry = getCompetitorEntry(prevRound, ctx.competitorId)
      if (!currentEntry || !prevEntry) return { earned: false }

      const positionDrop = currentEntry.position - prevEntry.position
      return { earned: positionDrop >= 3 }
    },
  ],
  [
    "Contrarian",
    (ctx) => {
      // Win when you're the only one who bet on your driver.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      const betDriverId = entry.bet.toString()
      const othersWithSameBet = ctx.currentRound.competitors.filter(
        (c) => c.competitor.toString() !== ctx.competitorId.toString() && c.bet?.toString() === betDriverId,
      ).length

      return { earned: othersWithSameBet === 0 }
    },
  ],
  [
    "Safety Car",
    (ctx) => {
      // Score exactly 3 points in 3 consecutive rounds.
      if (ctx.currentRoundIndex < 2) return { earned: false }

      let streak = 0
      for (let i = ctx.currentRoundIndex; i >= 0 && streak < 3; i--) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry?.points === 3) {
          streak++
        } else {
          break
        }
      }
      return { earned: streak >= 3 }
    },
  ],
  [
    "Track Limits",
    (ctx) => {
      // Finish exactly P4 (just off podium) 3 times in a season.
      let p4Count = 0
      for (let i = 0; i <= ctx.currentRoundIndex; i++) {
        const round = ctx.allRounds[i]
        if (!isRoundCompleted(round)) continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry?.position === 4) p4Count++
      }
      return { earned: p4Count >= 3 }
    },
  ],
  [
    "Lone Wolf",
    (ctx) => {
      // Win when you were the last person to place your bet.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }

      // Find all bet timestamps for this round.
      // updated_at tracks when the bet was last placed/changed.
      const betsWithTimestamps = ctx.currentRound.competitors
        .filter((c) => c.bet && c.updated_at)
        .map((c) => ({
          id: c.competitor.toString(),
          time: new Date(c.updated_at!).getTime(),
        }))

      // Require at least MIN_COMPETITORS_LONE_WOLF bettors to avoid trivial awards.
      if (betsWithTimestamps.length < MIN_COMPETITORS_LONE_WOLF) return { earned: false }

      // Check if this competitor was the last to bet.
      const myBet = betsWithTimestamps.find((b) => b.id === ctx.competitorId.toString())
      if (!myBet) return { earned: false }

      const isLastToBet = betsWithTimestamps.every((b) => b.time <= myBet.time)
      return { earned: isLastToBet }
    },
  ],
]
