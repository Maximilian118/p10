import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode } from "../types"
import { createBackButton, createViewsButton } from "./baseConfigs"

// Strategy for default views (deleteChamp, invite, etc.) that use simple Back + Views buttons.
export const defaultStrategy: ToolbarStrategy = {
  getConfig(context: ToolbarContext): ToolbarConfig {
    return {
      buttons: [createBackButton(context.onBack), createViewsButton(context.onDrawerClick)],
    }
  },

  getMode(): ViewMode {
    return "browse"
  },
}
