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

// Computes the effective average after applying the 5% missed-round penalty.
export const computeEffectiveAverage = (member: LeagueMemberType): number => {
  return Math.max(0, member.cumulativeAverage - (member.missedRounds || 0) * 5)
}

// Recalculates league standings (positions) for all active championships.
// Sorts by effective average (raw average - 5% per missed round) descending.
// Tiebreaker: more rounds completed.
export const recalculateLeagueStandings = (
  championships: LeagueMemberType[],
): void => {
  const active = championships.filter(c => c.active)

  active.sort((a, b) => {
    const aEffective = computeEffectiveAverage(a)
    const bEffective = computeEffectiveAverage(b)
    if (bEffective !== aEffective) return bEffective - aEffective
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

// Archives a league season: snapshots standings, creates history entry, resets members for the next year.
// Follows the same pattern as championship archiveSeason in resolverUtility.ts.
export const archiveLeagueSeason = async (leagueId: string): Promise<void> => {
  try {
    const league = await League.findById(leagueId)
    if (!league) {
      log.error(`archiveLeagueSeason: League ${leagueId} not found`)
      return
    }

    const currentSeason = league.season
    const active = league.championships.filter((c) => c.active)

    // Apply penalties and determine final standings.
    active.sort((a, b) => {
      const aEff = computeEffectiveAverage(a)
      const bEff = computeEffectiveAverage(b)
      if (bEff !== aEff) return bEff - aEff
      return b.roundsCompleted - a.roundsCompleted
    })
    active.forEach((m, i) => {
      m.position = i + 1
    })

    // Snapshot final standings for the 24h results view.
    league.seasonEndStandings = league.championships.map((m) => ({
      championship: m.championship,
      adjudicator: m.adjudicator,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      active: m.active,
      scores: [...m.scores],
      cumulativeScore: m.cumulativeScore,
      roundsCompleted: m.roundsCompleted,
      cumulativeAverage: m.cumulativeAverage,
      missedRounds: m.missedRounds,
      position: m.position,
    }))

    // Push history entry with winner and runner-up.
    const winner = active[0] || null
    const runnerUp = active[1] || null
    league.history.push({
      season: currentSeason,
      championships: league.seasonEndStandings,
      winner: winner
        ? { championship: winner.championship, adjudicator: winner.adjudicator }
        : null,
      runnerUp: runnerUp
        ? { championship: runnerUp.championship, adjudicator: runnerUp.adjudicator }
        : null,
      finalizedAt: moment().format(),
    })

    // Reset all member scores for the new season.
    for (const member of league.championships) {
      member.scores = []
      member.cumulativeScore = 0
      member.roundsCompleted = 0
      member.cumulativeAverage = 0
      member.missedRounds = 0
      member.position = 0
    }

    // Increment season to the next year.
    league.season = currentSeason + 1

    // Set seasonEndedAt to trigger the 24h results view on the frontend.
    league.seasonEndedAt = moment().format()

    league.markModified("championships")
    league.markModified("seasonEndStandings")
    league.markModified("history")
    league.updated_at = moment().format()
    await league.save()

    log.info(`Archived league "${league.name}" season ${currentSeason} — now season ${league.season}`)
  } catch (err) {
    log.error(`archiveLeagueSeason error for league ${leagueId}: ${err}`)
  }
}
