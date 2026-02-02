import { ChampView } from "../../../Views/ChampSettings/ChampSettings"
import { ToolbarStrategy } from "../types"
import { formViewStrategy, isFormView } from "./formViewConfig"
import { badgesStrategy } from "./badgesConfig"
import { rulesAndRegsStrategy } from "./rulesAndRegsConfig"
import { competitorsStrategy } from "./competitorsConfig"
import { defaultStrategy } from "./defaultConfig"

// Registry mapping views to their strategies.
const strategyRegistry: Partial<Record<ChampView, ToolbarStrategy>> = {
  competitors: competitorsStrategy,
  badges: badgesStrategy,
  rulesAndRegs: rulesAndRegsStrategy,
}

// Resolves the appropriate strategy for a given view.
export const getStrategy = (view: ChampView): ToolbarStrategy => {
  // Check if it's a form view first.
  if (isFormView(view)) {
    return formViewStrategy
  }

  // Look up in registry.
  const strategy = strategyRegistry[view]
  if (strategy) {
    return strategy
  }

  // Fall back to default strategy.
  return defaultStrategy
}

// Export individual strategies for testing.
export { formViewStrategy, badgesStrategy, rulesAndRegsStrategy, competitorsStrategy, defaultStrategy }
export { isFormView }
