// Badge evaluator registry combining all category evaluators.

import { BadgeChecker } from "../types"
import { roundPerformanceEvaluators } from "./roundPerformance"
import { pointsScoringEvaluators } from "./pointsScoring"
import { championshipEvaluators } from "./championship"
import { participationEvaluators } from "./participation"
import { driverBetsEvaluators } from "./driverBets"
import { streaksEvaluators } from "./streaks"
import { comebackEvaluators } from "./comeback"
import { quirkyEvaluators } from "./quirky"

// Combined badge checker registry from all category files.
export const badgeCheckerRegistry: Map<string, BadgeChecker> = new Map([
  ...roundPerformanceEvaluators,
  ...pointsScoringEvaluators,
  ...championshipEvaluators,
  ...participationEvaluators,
  ...driverBetsEvaluators,
  ...streaksEvaluators,
  ...comebackEvaluators,
  ...quirkyEvaluators,
])
