import React from "react"
import { Delete, Update, ArrowUpward, ArrowBack } from "@mui/icons-material"
import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode, RulesAndRegsToolbarProps } from "../types"
import { createBackButton, createAddButton } from "./baseConfigs"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"

// Strategy for rules and regs view with browse, edit, and deleteConfirm modes.
export const rulesAndRegsStrategy: ToolbarStrategy = {
  getConfig(context: ToolbarContext, mode: ViewMode, props?: RulesAndRegsToolbarProps): ToolbarConfig {
    // Delete confirmation mode - Back on left, Delete on right.
    if (mode === "deleteConfirm") {
      return {
        leftButtons: [
          {
            label: "Back",
            onClick: props?.onDelConfirmBack,
            startIcon: <ArrowBack />,
            color: "inherit",
          },
        ],
        rightButtons: [
          {
            label: "Delete",
            onClick: props?.onDelete,
            loading: props?.deleteLoading,
            startIcon: <Delete />,
            color: "error",
          },
        ],
      }
    }

    // Browse mode - Back + Add (adjudicator/admin only).
    if (mode === "browse") {
      const rightButtons: ButtonConfig[] = []

      if (context.isAdjudicator || context.isAdmin) {
        rightButtons.push(createAddButton(props?.onAdd))
      }

      return {
        leftButtons: [createBackButton(context.onBack)],
        rightButtons,
      }
    }

    // Edit mode - flat layout with Back, Delete (if not new), Submit/Update.
    const buttons: ButtonConfig[] = [createBackButton(props?.onBack)]

    // Delete button only for existing rules (not new).
    if (!props?.isNewRule) {
      buttons.push({
        label: "Delete",
        startIcon: <Delete />,
        onClick: props?.onDelete,
        loading: props?.deleteLoading,
        color: "error",
      })
    }

    // Submit (new rule) or Update (existing rule) button.
    buttons.push({
      label: props?.isNewRule ? "Submit" : "Update",
      startIcon: props?.isNewRule ? <ArrowUpward /> : <Update />,
      onClick: props?.onSubmit,
      loading: props?.loading,
      disabled: props?.canSubmit === false,
    })

    return { buttons }
  },

  getMode(props?: RulesAndRegsToolbarProps): ViewMode {
    if (props?.delConfirm) return "deleteConfirm"
    if (props?.isEdit) return "edit"
    return "browse"
  },
}
