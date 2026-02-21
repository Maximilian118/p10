import moment from "moment"
import { Round } from "../models/champ"
import League, {
  LeagueScoreType,
  LeagueContributionType,
  LeagueMemberType,
} from "../models/league"
import { positionToRankIndex } from "../graphql/resolvers/resolverUtility"
import { createLogger } from "./logger"

const log = createLogger("LeagueScoring")

// Calculates an individual prediction score (0-100%) based on driver finishing position.
// Uses the P10-centric rank index: P10=0 (best), P9=1, P8=2, ..., P1=9, P11=10, etc.
export const calculatePredictionScore = (
  driverPosition: number,
  totalDrivers: number,
): number => {
  if (totalDrivers <= 1) return 100
  const rankIndex = positionToRankIndex(driverPosition)
  const score = ((totalDrivers - 1 - rankIndex) / (totalDrivers - 1)) * 100
  return Math.max(0, Math.round(score * 100) / 100)
}

// Calculates the average P10 rank distance for a set of contributions.
const calculateAvgP10Distance = (contributions: LeagueContributionType[]): number => {
  const bettors = contributions.filter(c => c.driverPosition > 0)
  if (bettors.length === 0) return 0
  const totalRank = bettors.reduce((sum, c) => sum + positionToRankIndex(c.driverPosition), 0)
  return Math.round((totalRank / bettors.length) * 100) / 100
}

// Calculates a championship's prediction score for a completed round.
// Non-bettors receive 0%, bringing down the championship average.
export const calculateChampionshipRoundScore = (
  round: Round,
  totalDrivers: number,
): LeagueScoreType => {
  const totalCompetitors = round.competitors.length
  const contributions: LeagueContributionType[] = []
  let p10Hits = 0

  // Build driver position map for quick lookup.
  const driverPositionMap = new Map<string, number>()
  for (const d of round.drivers) {
    if (d.driver) {
      driverPositionMap.set(d.driver.toString(), d.positionActual)
    }
  }

  // Calculate individual prediction scores for each competitor.
  for (const competitor of round.competitors) {
    if (!competitor.bet) {
      // Non-bettor gets 0% - still counted in the average to penalise inactive championships.
      contributions.push({
        competitor: competitor.competitor,
        driver: null,
        driverPosition: 0,
        predictionScore: 0,
      })
      continue
    }

    const driverPosition = driverPositionMap.get(competitor.bet.toString())
    if (driverPosition === undefined) continue

    const predictionScore = calculatePredictionScore(driverPosition, totalDrivers)
    if (driverPosition === 10) p10Hits++

    contributions.push({
      competitor: competitor.competitor,
      driver: competitor.bet,
      driverPosition,
      predictionScore,
    })
  }

  // Championship average: sum of ALL scores (including 0%) / total competitors.
  const totalScore = contributions.reduce((sum, c) => sum + c.predictionScore, 0)
  const predictionScore = totalCompetitors > 0
    ? Math.round((totalScore / totalCompetitors) * 100) / 100
    : 0

  // Find best and worst predictions (among bettors only).
  const bettorContributions = contributions.filter(c => c.driverPosition > 0)
  const sortedBettors = [...bettorContributions].sort((a, b) => b.predictionScore - a.predictionScore)
  const bestPrediction = sortedBettors[0] || null
  const worstPrediction = sortedBettors[sortedBettors.length - 1] || null

  return {
    champRoundNumber: round.round,
    predictionScore,
    completedAt: moment().format(),
    insights: {
      totalCompetitors,
      competitorsWhoBet: bettorContributions.length,
      avgP10Distance: calculateAvgP10Distance(contributions),
      bestPrediction,
      worstPrediction,
      p10Hits,
      contributions,
    },
  }
}

// Recalculates league standings (positions) for all active championships.
// Sorts by cumulativeAverage descending, tiebreaker: more rounds completed.
export const recalculateLeagueStandings = (
  championships: LeagueMemberType[],
): void => {
  const active = championships.filter(c => c.active)

  active.sort((a, b) => {
    if (b.cumulativeAverage !== a.cumulativeAverage) {
      return b.cumulativeAverage - a.cumulativeAverage
    }
    return b.roundsCompleted - a.roundsCompleted
  })

  active.forEach((member, idx) => {
    member.position = idx + 1
  })
}

// Determines if a league is locked based on the 20% rule.
// Lock threshold = ceil(seriesRounds * 0.2).
// Locked once any active championship has completed that many rounds.
export const isLeagueLocked = (
  seriesRounds: number,
  championships: LeagueMemberType[],
): { locked: boolean; lockThreshold: number } => {
  const lockThreshold = Math.ceil(seriesRounds * 0.2)
  const active = championships.filter(c => c.active)
  const locked = active.some(member => member.roundsCompleted >= lockThreshold)
  return { locked, lockThreshold }
}

// Updates a championship's league score after a round is processed.
// Called from resultsHandler STEP 8.
export const updateLeagueScore = async (
  champId: string,
  leagueId: string,
  currentRound: Round,
): Promise<void> => {
  try {
    const league = await League.findById(leagueId)
    if (!league) {
      log.warn(`League ${leagueId} not found for championship ${champId}`)
      return
    }

    // Find this championship's active membership entry.
    const member = league.championships.find(
      c => c.championship.toString() === champId && c.active,
    )
    if (!member) {
      log.warn(`Championship ${champId} not found as active member of league ${leagueId}`)
      return
    }

    // Guard against duplicate round processing.
    const alreadyScored = member.scores.some(s => s.champRoundNumber === currentRound.round)
    if (alreadyScored) {
      log.info(`League score for round ${currentRound.round} already recorded, skipping`)
      return
    }

    // Calculate the round's prediction score.
    const totalDrivers = currentRound.drivers.length
    const roundScore = calculateChampionshipRoundScore(currentRound, totalDrivers)

    // Add the score and update running totals.
    member.scores.push(roundScore)
    member.cumulativeScore += roundScore.predictionScore
    member.roundsCompleted += 1
    member.cumulativeAverage = member.roundsCompleted > 0
      ? Math.round((member.cumulativeScore / member.roundsCompleted) * 100) / 100
      : 0

    // Recalculate standings for all active members.
    recalculateLeagueStandings(league.championships)

    league.markModified("championships")
    league.updated_at = moment().format()
    await league.save()

    log.info(
      `Updated league ${leagueId} score for champ ${champId}: ` +
      `round ${currentRound.round} = ${roundScore.predictionScore}%, ` +
      `cumulative average = ${member.cumulativeAverage}%`,
    )
  } catch (err) {
    log.error(`Error updating league score for champ ${champId}: ${err}`)
  }
}
