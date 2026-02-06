import { ChampView } from "../../../Views/ChampSettings/ChampSettings"
import { ToolbarStrategy } from "../types"
import { formViewStrategy, isFormView } from "./formViewConfig"
import { badgesStrategy } from "./badgesConfig"
import { rulesAndRegsStrategy } from "./rulesAndRegsConfig"
import { competitorsStrategy } from "./competitorsConfig"
import { protestsStrategy } from "./protestsConfig"
import { protestStrategy } from "./protestConfig"
import { defaultStrategy } from "./defaultConfig"
import { demoModeStrategy } from "./demoModeConfig"

// Registry mapping views to their strategies.
const strategyRegistry: Partial<Record<ChampView, ToolbarStrategy>> = {
  competitors: competitorsStrategy,
  badges: badgesStrategy,
  rulesAndRegs: rulesAndRegsStrategy,
  protests: protestsStrategy,
  protest: protestStrategy,
  demoMode: demoModeStrategy,
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
export { formViewStrategy, badgesStrategy, rulesAndRegsStrategy, competitorsStrategy, protestsStrategy, protestStrategy, defaultStrategy, demoModeStrategy }
export { isFormView }
