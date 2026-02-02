import React from "react"
import { ArrowBack, FilterList } from "@mui/icons-material"
import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode, CompetitorsToolbarProps } from "../types"
import { createViewsButton } from "./baseConfigs"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"

// Strategy for competitors view.
// Note: Join button is handled separately via useJoinButton hook and passed as extraConfig.
export const competitorsStrategy: ToolbarStrategy = {
  getConfig(
    context: ToolbarContext,
    mode: ViewMode,
    props?: CompetitorsToolbarProps,
    joinButtonConfig?: ButtonConfig
  ): ToolbarConfig {
    // Adjudicator view mode - simplified toolbar (back + views only).
    if (props?.adjudicatorView) {
      return {
        leftButtons: [
          {
            label: "Back",
            onClick: props?.onExitAdjudicatorView,
            startIcon: <ArrowBack />,
            color: "inherit",
          },
        ],
        rightButtons: [
          {
            label: "Views",
            onClick: context.onDrawerClick,
            endIcon: <FilterList />,
          },
        ],
      }
    }

    // Normal competitors view - join button (if applicable) + views.
    const buttons: ButtonConfig[] = []

    if (joinButtonConfig) {
      buttons.push(joinButtonConfig)
    }

    buttons.push(createViewsButton(context.onDrawerClick))

    return { buttons }
  },

  getMode(props?: CompetitorsToolbarProps): ViewMode {
    return props?.adjudicatorView ? "edit" : "browse"
  },
}
