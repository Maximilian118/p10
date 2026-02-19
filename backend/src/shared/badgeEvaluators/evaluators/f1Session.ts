// F1 session data badge evaluators.
// These badges leverage rich F1 API session data (safety cars, red flags, weather, etc.)
// and only fire for API-enabled championships (ctx.f1SessionData is defined).

import { BadgeChecker, BadgeContext } from "../types"
import { didCompetitorWin, getCompetitorBetDriver } from "../helpers"

// ============================================================================
// HELPER: Early return if no F1 session data available.
// ============================================================================

// Returns true if the competitor won this round AND F1 session data exists.
const wonWithSessionData = (ctx: BadgeContext): boolean => {
  return !!ctx.f1SessionData && didCompetitorWin(ctx.currentRound, ctx.competitorId)
}

// Returns the bet driver's session data entry for this competitor, or null if unavailable.
const getBetDriverSessionData = (ctx: BadgeContext) => {
  if (!ctx.f1SessionData) return null
  const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
  if (!betDriver) return null
  const driverId = betDriver.driver.toString()
  return ctx.f1SessionData.driverSessionData.get(driverId) ?? null
}

// ============================================================================
// SAFETY CAR / INCIDENT BADGES
// ============================================================================

// Win a round where the session had a safety car.
const safetyCarWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadSafetyCar }
}

// Win when session had 2+ safety car periods.
const multiSafetyCarWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.safetyCarCount >= 2 }
}

// Win when session had a virtual safety car.
const vscWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadVSC }
}

// Win when session had a red flag.
const redFlagWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadRedFlag }
}

// Win when session had 2+ red flags.
const multiRedFlagWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.redFlagCount >= 2 }
}

// Win when medical car was deployed during session.
const medicalCarWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadMedicalCar }
}

// ============================================================================
// WEATHER BADGES
// ============================================================================

// Win when session had rainfall.
const wetWeatherWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadRain }
}

// Win in fully dry conditions (no rain in any weather snapshot).
const dryWeatherWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && !ctx.f1SessionData!.hadRain }
}

// ============================================================================
// FASTEST LAP / SPEED BADGES
// ============================================================================

// Bet on the driver who set the session fastest lap.
const fastestLapBet: BadgeChecker = (ctx) => {
  if (!ctx.f1SessionData?.fastestLapDriverId) return { earned: false }
  const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
  if (!betDriver) return { earned: false }
  const driverId = betDriver.driver.toString()
  return { earned: driverId === ctx.f1SessionData.fastestLapDriverId }
}

// Win AND bet on the driver who set the fastest lap.
const fastestLapWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  if (!ctx.f1SessionData?.fastestLapDriverId) return { earned: false }
  const betDriver = getCompetitorBetDriver(ctx.currentRound, ctx.competitorId)
  if (!betDriver) return { earned: false }
  return { earned: betDriver.driver.toString() === ctx.f1SessionData.fastestLapDriverId }
}

// ============================================================================
// DNF-SPECIFIC BADGES
// ============================================================================

// Bet on driver whose DNF was from a collision/crash.
const collisionDnfBet: BadgeChecker = (ctx) => {
  const driverData = getBetDriverSessionData(ctx)
  if (!driverData || driverData.driverStatus !== "dnf" || !driverData.dnfReason) return { earned: false }
  const reason = driverData.dnfReason.toLowerCase()
  return { earned: reason.includes("collision") || reason.includes("crash") || reason.includes("contact") || reason.includes("accident") }
}

// Bet on driver whose DNF was mechanical/engine failure.
const mechanicalDnfBet: BadgeChecker = (ctx) => {
  const driverData = getBetDriverSessionData(ctx)
  if (!driverData || driverData.driverStatus !== "dnf" || !driverData.dnfReason) return { earned: false }
  const reason = driverData.dnfReason.toLowerCase()
  return { earned: reason.includes("mechanical") || reason.includes("engine") || reason.includes("power unit") || reason.includes("gearbox") || reason.includes("hydraulic") }
}

// Win when 3+ drivers DNF'd in the session.
const noDnfWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.dnfCount >= 3 }
}

// Win when 5+ drivers DNF'd in the session.
const highDnfWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.dnfCount >= 5 }
}

// ============================================================================
// SESSION DRAMA BADGES
// ============================================================================

// Win when session had 2+ drama types (SC, red flag, rain).
const chaoticSessionWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const data = ctx.f1SessionData!
  let dramaCount = 0
  if (data.hadSafetyCar || data.hadVSC) dramaCount++
  if (data.hadRedFlag) dramaCount++
  if (data.hadRain) dramaCount++
  return { earned: dramaCount >= 2 }
}

// Win when session had zero incidents (no flags, no SC, no DNFs).
const cleanSessionWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const data = ctx.f1SessionData!
  return { earned: !data.hadSafetyCar && !data.hadVSC && !data.hadRedFlag && !data.hadYellowFlag && data.dnfCount === 0 }
}

// Win when session had 5+ race control events.
const dramaticSessionWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.raceControlEventCount >= 5 }
}

// Win when session was stopped and resumed (red flag).
const sessionStoppedWin: BadgeChecker = (ctx) => {
  return { earned: wonWithSessionData(ctx) && ctx.f1SessionData!.hadRedFlag }
}

// ============================================================================
// TYRE STRATEGY BADGES
// ============================================================================

// Bet on driver who set their best lap on soft tyres.
const softTyreBet: BadgeChecker = (ctx) => {
  const driverData = getBetDriverSessionData(ctx)
  if (!driverData) return { earned: false }
  return { earned: driverData.compounds.some((c) => c.toLowerCase() === "soft") }
}

// Win with driver who used hard compound during session.
const hardTyreWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const driverData = getBetDriverSessionData(ctx)
  if (!driverData) return { earned: false }
  return { earned: driverData.compounds.some((c) => c.toLowerCase() === "hard") }
}

// ============================================================================
// PIT STOP BADGES
// ============================================================================

// Win with driver who had fewest pit stops among classified.
const fewestPitsWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const betDriverData = getBetDriverSessionData(ctx)
  if (!betDriverData) return { earned: false }

  // Find minimum pit stops among all classified drivers.
  let minPits = Infinity
  ctx.f1SessionData!.driverSessionData.forEach((d) => {
    if (d.driverStatus !== "dnf" && d.driverStatus !== "dns" && d.driverStatus !== "dsq") {
      minPits = Math.min(minPits, d.pitStopCount)
    }
  })

  return { earned: betDriverData.pitStopCount === minPits && minPits < Infinity }
}

// Win with driver who did a one-stop strategy.
const oneStopWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const driverData = getBetDriverSessionData(ctx)
  if (!driverData) return { earned: false }
  return { earned: driverData.pitStopCount === 1 }
}

// Win with driver who had the most pit stops (alternate strategy).
const mostPitsWin: BadgeChecker = (ctx) => {
  if (!wonWithSessionData(ctx)) return { earned: false }
  const betDriverData = getBetDriverSessionData(ctx)
  if (!betDriverData) return { earned: false }

  // Find maximum pit stops among all drivers.
  let maxPits = 0
  ctx.f1SessionData!.driverSessionData.forEach((d) => {
    maxPits = Math.max(maxPits, d.pitStopCount)
  })

  return { earned: betDriverData.pitStopCount === maxPits && maxPits > 1 }
}

// ============================================================================
// REGISTRY
// ============================================================================

// All F1 session data badge evaluators.
export const f1SessionEvaluators: [string, BadgeChecker][] = [
  // Safety Car / Incident.
  ["Safety Car Win", safetyCarWin],
  ["Multi Safety Car Win", multiSafetyCarWin],
  ["VSC Win", vscWin],
  ["Red Flag Win", redFlagWin],
  ["Multi Red Flag Win", multiRedFlagWin],
  ["Medical Car Win", medicalCarWin],
  // Weather.
  ["Wet Weather Win", wetWeatherWin],
  ["Dry Weather Win", dryWeatherWin],
  // Fastest Lap.
  ["Fastest Lap Bet", fastestLapBet],
  ["Fastest Lap Win", fastestLapWin],
  // DNF-Specific.
  ["Collision DNF Bet", collisionDnfBet],
  ["Mechanical DNF Bet", mechanicalDnfBet],
  ["No DNF Win", noDnfWin],
  ["High DNF Win", highDnfWin],
  // Session Drama.
  ["Chaotic Session Win", chaoticSessionWin],
  ["Clean Session Win", cleanSessionWin],
  ["Dramatic Session Win", dramaticSessionWin],
  ["Session Stopped Win", sessionStoppedWin],
  // Tyre Strategy.
  ["Soft Tyre Bet", softTyreBet],
  ["Hard Tyre Win", hardTyreWin],
  // Pit Stops.
  ["Fewest Pits Win", fewestPitsWin],
  ["One-Stop Win", oneStopWin],
  ["Most Pits Win", mostPitsWin],
]
