// Badge evaluation type definitions.

import { ObjectId } from "mongodb"
import { Round, ChampType } from "../../models/champ"
import { driverType } from "../../models/driver"

// Context passed to all badge checker functions.
export interface BadgeContext {
  competitorId: ObjectId
  currentRound: Round
  currentRoundIndex: number
  champ: ChampType
  allRounds: Round[]
  maxCompetitors: number
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
