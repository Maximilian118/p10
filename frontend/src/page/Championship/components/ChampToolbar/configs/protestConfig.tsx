import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode } from "../types"
import { createBackButton } from "./baseConfigs"

// Strategy for the protest detail view.
export const protestStrategy: ToolbarStrategy = {
  // Returns button config: back button on left, nothing on right.
  getConfig(context: ToolbarContext): ToolbarConfig {
    return {
      leftButtons: [createBackButton(context.onBack)],
      rightButtons: [],
    }
  },

  // Protest detail is always in browse mode.
  getMode(): ViewMode {
    return "browse"
  },
}
