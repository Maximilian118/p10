import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode } from "../types"
import { createBackButton } from "./baseConfigs"

// Strategy for demo mode view - shows only a back button to return to settings.
export const demoModeStrategy: ToolbarStrategy = {
  getConfig(context: ToolbarContext): ToolbarConfig {
    return {
      leftButtons: [createBackButton(context.onBack)],
      rightButtons: [{
        label: "DEMO",
        className: "demo-toolbar-badge",
      }],
    }
  },

  getMode(): ViewMode {
    return "browse"
  },
}
