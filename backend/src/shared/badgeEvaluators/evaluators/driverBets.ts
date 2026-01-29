// Driver and bet specific badge evaluators.

import { BadgeChecker } from "../types"
import {
  getCompetitorEntry,
  getCompetitorBetDriver,
  didCompetitorWin,
  getUniqueDriversBetInLastNRounds,
  getSameDriverBetStreak,
  EUROPEAN_COUNTRIES,
  calculateDriverAge,
} from "../helpers"
import {
  createExtremeStatWinChecker,
  createDriverFeatureWinChecker,
} from "../factories"

// Driver/bet specific badge evaluators.
export const driverBetsEvaluators: [string, BadgeChecker][] = [
  // Extreme stat wins - using factory for DRY code.
  ["Oldest Driver Win", createExtremeStatWinChecker("birthday", "min")],
  ["Youngest Driver Win", createExtremeStatWinChecker("birthday", "max")],
  ["Tallest Driver Win", createExtremeStatWinChecker("heightCM", "max")],
  ["Shortest Driver Win", createExtremeStatWinChecker("heightCM", "min")],
  ["Heaviest Driver Win", createExtremeStatWinChecker("weightKG", "max")],
  ["Lightest Driver Win", createExtremeStatWinChecker("weightKG", "min")],
  // Driver feature wins - using factory for DRY code.
  ["Moustache Win", createDriverFeatureWinChecker("moustache")],
  ["Mullet Win", createDriverFeatureWinChecker("mullet")],
  ["Moustache & Mullet", createDriverFeatureWinChecker("both")],
  [
    "Pole Position Win",
    (ctx) => {
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver?.positionActual === 1 }
    },
  ],
  [
    "Underdog Win",
    (ctx) => {
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      // Find lowest ranked team (highest positionConstructors)
      const maxTeamPosition = Math.max(...ctx.currentRound.teams.map((t) => t.positionConstructors))
      const lowestTeam = ctx.currentRound.teams.find((t) => t.positionConstructors === maxTeamPosition)
      if (!lowestTeam) return { earned: false }

      // Check if bet driver is from that team
      return { earned: lowestTeam.drivers.some((d) => d.toString() === entry.bet?.toString()) }
    },
  ],
  [
    "Top Team Loss",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet || entry.points > 0) return { earned: false }

      // Find top ranked team (positionConstructors === 1)
      const topTeam = ctx.currentRound.teams.find((t) => t.positionConstructors === 1)
      if (!topTeam) return { earned: false }

      return { earned: topTeam.drivers.some((d) => d.toString() === entry.bet?.toString()) }
    },
  ],
  [
    "6 Different Drivers",
    (ctx) => {
      const uniqueDrivers = getUniqueDriversBetInLastNRounds(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, 6)
      return { earned: uniqueDrivers.size >= 6 }
    },
  ],
  [
    "Same Driver x3",
    (ctx) => {
      const streak = getSameDriverBetStreak(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex)
      return { earned: streak >= 3 }
    },
  ],
  [
    "Outside Top 10 Win",
    (ctx) => {
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver ? betDriver.positionActual > 10 : false }
    },
  ],
  [
    "Q1 Elimination Bet",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      // Q1 elimination = position 16-20 (or higher)
      return { earned: betDriver ? betDriver.positionActual >= 16 : false }
    },
  ],
  [
    "Q2 Elimination Bet",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      // Q2 elimination = position 11-15
      return { earned: betDriver ? betDriver.positionActual >= 11 && betDriver.positionActual <= 15 : false }
    },
  ],
  [
    "DNF Driver Bet",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      // DNF = position 0 or very high (e.g., 99)
      return { earned: betDriver ? betDriver.positionActual === 0 || betDriver.positionActual >= 21 : false }
    },
  ],
  // Additional driver/bet pattern badges
  [
    "Same Driver x5",
    (ctx) => {
      const streak = getSameDriverBetStreak(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex)
      return { earned: streak >= 5 }
    },
  ],
  [
    "Same Driver x10",
    (ctx) => {
      const streak = getSameDriverBetStreak(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex)
      return { earned: streak >= 10 }
    },
  ],
  [
    "10 Different Drivers",
    (ctx) => {
      const uniqueDrivers = getUniqueDriversBetInLastNRounds(ctx.allRounds, ctx.competitorId, ctx.currentRoundIndex, 10)
      return { earned: uniqueDrivers.size >= 10 }
    },
  ],
  [
    "Bet on Every Driver",
    (ctx) => {
      // Bet on every driver on the grid at least once
      const allDriverIds = new Set(ctx.currentRound.drivers.map((d) => d.driver.toString()))
      const betDrivers = new Set<string>()

      for (const round of ctx.allRounds) {
        if (round.status !== "completed" && round.status !== "results") continue
        const entry = getCompetitorEntry(round, ctx.competitorId)
        if (entry?.bet) betDrivers.add(entry.bet.toString())
      }

      for (const driverId of allDriverIds) {
        if (!betDrivers.has(driverId)) return { earned: false }
      }
      return { earned: true }
    },
  ],
  [
    "Rookie Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver in their first championship
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.champsCompleted === 0 }
    },
  ],
  [
    "Veteran Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver who has completed 10+ championships
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.champsCompleted ? driver.stats.champsCompleted >= 10 : false }
    },
  ],
  [
    "Champion Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver who has won championships
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.champsWon ? driver.stats.champsWon > 0 : false }
    },
  ],
  [
    "Backmarker Hero",
    (ctx) => {
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      // Find backmarker teams (bottom 3)
      const sortedTeams = [...ctx.currentRound.teams].sort((a, b) => b.positionConstructors - a.positionConstructors)
      const backmarkerTeams = sortedTeams.slice(0, 3)

      return {
        earned: backmarkerTeams.some((team) => team.drivers.some((d) => d.toString() === entry.bet?.toString())),
      }
    },
  ],
  [
    "Midfield Master",
    (ctx) => {
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      const totalTeams = ctx.currentRound.teams.length
      const midfieldMin = Math.floor(totalTeams / 3) + 1
      const midfieldMax = Math.ceil((totalTeams * 2) / 3)

      for (const team of ctx.currentRound.teams) {
        if (team.positionConstructors >= midfieldMin && team.positionConstructors <= midfieldMax) {
          if (team.drivers.some((d) => d.toString() === entry.bet?.toString())) {
            return { earned: true }
          }
        }
      }
      return { earned: false }
    },
  ],
  [
    "Top 3 Team Loss",
    (ctx) => {
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet || entry.points > 0) return { earned: false }

      for (const team of ctx.currentRound.teams) {
        if (team.positionConstructors <= 3) {
          if (team.drivers.some((d) => d.toString() === entry.bet?.toString())) {
            return { earned: true }
          }
        }
      }
      return { earned: false }
    },
  ],
  [
    "European Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver from a European country.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.nationality ? EUROPEAN_COUNTRIES.includes(driver.stats.nationality) : false }
    },
  ],
  [
    "Non-European Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver from a non-European country.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.nationality ? !EUROPEAN_COUNTRIES.includes(driver.stats.nationality) : false }
    },
  ],
  [
    "Debutant Bet",
    (ctx, populatedDrivers) => {
      // Bet on a driver in their first round ever
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.roundsCompleted === 0 }
    },
  ],
  [
    "Under 22 Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver younger than 22.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      if (!driver?.stats?.birthday) return { earned: false }
      const age = calculateDriverAge(driver.stats.birthday)
      return { earned: age < 22 }
    },
  ],
  [
    "Over 35 Driver Win",
    (ctx, populatedDrivers) => {
      // Win with a driver older than 35.
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      if (!driver?.stats?.birthday) return { earned: false }
      const age = calculateDriverAge(driver.stats.birthday)
      return { earned: age > 35 }
    },
  ],
  [
    "Pole Picker",
    (ctx, populatedDrivers) => {
      // Win by betting on driver who took pole (positionActual === 1 in qualifying).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver?.positionActual === 1 }
    },
  ],
  [
    "Front Row Bet",
    (ctx, populatedDrivers) => {
      // Win by betting on driver who qualified in top 3 (positionActual <= 3).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      return { earned: betDriver ? betDriver.positionActual <= 3 : false }
    },
  ],
  [
    "P10 Magnet",
    (ctx, populatedDrivers) => {
      // Bet on a driver who has 5+ P10 finishes this season.
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: driver?.stats?.p10Finishes ? driver.stats.p10Finishes >= 5 : false }
    },
  ],
  [
    "Hot Streak Pick",
    (ctx, populatedDrivers) => {
      // Win with driver whose formScore is in top 3 (lower = better form).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      // Get all drivers with valid formScore and sort by form (lower = better).
      const driversWithForm = Array.from(populatedDrivers.values())
        .filter((d) => d.stats?.formScore !== undefined && d.stats.formScore > 0)
        .sort((a, b) => (a.stats?.formScore ?? 99) - (b.stats?.formScore ?? 99))

      // Check if bet driver is in top 3 best form.
      const top3DriverIds = driversWithForm.slice(0, 3).map((d) => d._id?.toString())
      return { earned: top3DriverIds.includes(entry.bet.toString()) }
    },
  ],
  [
    "Cold Pick",
    (ctx, populatedDrivers) => {
      // Win with driver whose formScore is in bottom 3 (higher = worse form).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }

      // Get all drivers with valid formScore and sort by form (higher = worse).
      const driversWithForm = Array.from(populatedDrivers.values())
        .filter((d) => d.stats?.formScore !== undefined && d.stats.formScore > 0)
        .sort((a, b) => (b.stats?.formScore ?? 0) - (a.stats?.formScore ?? 0))

      // Check if bet driver is in bottom 3 worst form.
      const bottom3DriverIds = driversWithForm.slice(0, 3).map((d) => d._id?.toString())
      return { earned: bottom3DriverIds.includes(entry.bet.toString()) }
    },
  ],
  [
    "Curse Breaker",
    (ctx, populatedDrivers) => {
      // Win with driver ending a 2+ DNF streak (API-dependent).
      if (!didCompetitorWin(ctx.currentRound, ctx.competitorId)) return { earned: false }
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      // Driver must have had a 2+ consecutive DNF streak (now broken).
      // Check betDriver's positionActual to see if they finished (not DNF).
      const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
      const didFinish = betDriver ? betDriver.positionActual > 0 && betDriver.positionActual < 21 : false
      return { earned: didFinish && (driver?.stats?.consecutiveDNFs ?? 0) >= 2 }
    },
  ],
  [
    "Disaster Magnet",
    (ctx, populatedDrivers) => {
      // Bet on a driver who has DNFed 3 rounds in a row (API-dependent).
      if (!populatedDrivers) return { earned: false }
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry?.bet) return { earned: false }
      const driver = populatedDrivers.get(entry.bet.toString())
      return { earned: (driver?.stats?.consecutiveDNFs ?? 0) >= 3 }
    },
  ],
  [
    "Switcheroo",
    (ctx) => {
      // Change your bet driver 3+ times in one betting window.
      // Check if the competitor's entry has betHistory with 3+ unique changes.
      const entry = getCompetitorEntry(ctx.currentRound, ctx.competitorId)
      if (!entry) return { earned: false }
      // betHistory is an array of bet ObjectIds tracked during betting window.
      const betHistory = (entry as unknown as { betHistory?: unknown[] }).betHistory
      if (!betHistory || !Array.isArray(betHistory)) return { earned: false }
      // Count unique changes (transitions between different drivers).
      let changes = 0
      for (let i = 1; i < betHistory.length; i++) {
        if (betHistory[i]?.toString() !== betHistory[i - 1]?.toString()) {
          changes++
        }
      }
      return { earned: changes >= 3 }
    },
  ],
]
