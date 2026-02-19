// Badge evaluation type definitions.

import { ObjectId } from "mongodb"
import { Round, ChampType } from "../../models/champ"
import { driverType } from "../../models/driver"

// Per-driver session data available to badge evaluators from F1 API.
export interface DriverSessionEntry {
  finalPosition: number | null
  gridPosition: number | null
  positionsGained: number
  pitStopCount: number
  totalPitStopTime: number
  stintCount: number
  compounds: string[] // Unique tyre compounds used during the session.
  bestLapTime: number | null
  bestLapNumber: number | null
  totalLaps: number
  driverStatus: string // "running" | "finished" | "dnf" | "dns" | "dsq"
  dnfReason: string | null
  topSpeed: number | null // Max speed trap reading across all laps.
}

// Aggregated F1 session data passed to badge evaluators for API-enabled championships.
export interface F1SessionData {
  // Session-wide characteristics.
  hadSafetyCar: boolean
  safetyCarCount: number
  hadVSC: boolean
  hadRedFlag: boolean
  redFlagCount: number
  hadYellowFlag: boolean
  hadRain: boolean
  hadMedicalCar: boolean
  raceControlEventCount: number

  // Session stats.
  fastestLapDriverId: string | null // DB Driver._id of fastest lap setter.
  fastestLapTime: number | null
  totalLaps: number | null
  sessionType: string
  dnfCount: number

  // Per-driver data keyed by DB Driver._id string.
  driverSessionData: Map<string, DriverSessionEntry>
}

// Context passed to all badge checker functions.
export interface BadgeContext {
  competitorId: ObjectId
  currentRound: Round
  currentRoundIndex: number
  champ: ChampType
  allRounds: Round[]
  maxCompetitors: number
  // Snapshot of each driver's consecutiveDNFs taken BEFORE stats update resets them.
  driverDNFSnapshot?: Map<string, number>
  // F1 session data for API-enabled championships (undefined for non-API).
  f1SessionData?: F1SessionData
}

// Result from a badge checker.
export interface BadgeCheckResult {
  earned: boolean
}

// Badge checker function signature.
export type BadgeChecker = (
  ctx: BadgeContext,
  populatedDrivers?: Map<string, driverType>,
) => BadgeCheckResult
