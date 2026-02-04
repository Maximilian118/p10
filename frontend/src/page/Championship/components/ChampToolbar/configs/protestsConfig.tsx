import React from "react"
import { ReportProblem, ArrowUpward } from "@mui/icons-material"
import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode, ProtestsToolbarProps } from "../types"
import { createBackButton } from "./baseConfigs"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"

// Creates a protest button for creating new protests.
const createProtestButton = (onClick?: () => void, disabled?: boolean): ButtonConfig => ({
  label: "Protest",
  onClick,
  endIcon: <ReportProblem />,
  color: "error",
  disabled,
})

// Creates a submit button for the create form.
const createSubmitButton = (onClick?: () => void, loading?: boolean): ButtonConfig => ({
  label: "Submit",
  onClick,
  startIcon: <ArrowUpward />,
  loading,
})

// Strategy for the protests view.
export const protestsStrategy: ToolbarStrategy = {
  // Returns button config based on mode.
  getConfig(
    context: ToolbarContext,
    mode: ViewMode,
    props?: ProtestsToolbarProps,
  ): ToolbarConfig {
    // Create mode: back on left, submit on right.
    if (mode === "create") {
      return {
        leftButtons: [createBackButton(props?.onCancelCreate)],
        rightButtons: [createSubmitButton(props?.onSubmitCreate, props?.createLoading)],
      }
    }

    // Browse mode: back on left, protest button on right.
    return {
      leftButtons: [createBackButton(context.onBack)],
      rightButtons: [createProtestButton(props?.onCreateProtest, !props?.canCreateProtest)],
    }
  },

  // Returns mode based on isCreating prop.
  getMode(props?: ProtestsToolbarProps): ViewMode {
    return props?.isCreating ? "create" : "browse"
  },
}
