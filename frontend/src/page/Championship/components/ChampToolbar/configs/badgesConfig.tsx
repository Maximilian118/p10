import React from "react"
import { Delete, Update, ArrowUpward } from "@mui/icons-material"
import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode, BadgeToolbarProps } from "../types"
import { createBackButton, createFilterButton, createAddButton } from "./baseConfigs"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"

// Strategy for badges view with browse and edit modes.
export const badgesStrategy: ToolbarStrategy = {
  getConfig(context: ToolbarContext, mode: ViewMode, props?: BadgeToolbarProps): ToolbarConfig {
    // Browse mode - grouped layout with Back on left, Filter + Add on right.
    if (mode === "browse") {
      const rightButtons: ButtonConfig[] = [createFilterButton(props?.onFilter)]

      // Only adjudicator can add badges.
      if (context.isAdjudicator) {
        rightButtons.push(createAddButton(props?.onAdd))
      }

      return {
        leftButtons: [createBackButton(context.onBack)],
        rightButtons,
      }
    }

    // Edit mode - flat layout with Back, Delete/Remove, Submit/Update, Views.
    const buttons: ButtonConfig[] = [createBackButton(props?.onBack)]

    // Existing badge (isEdit is badge object, not boolean) - show Remove or Delete.
    if (typeof props?.isEdit !== "boolean") {
      if (props?.canRemove) {
        buttons.push({
          label: "Remove",
          onClick: props?.onRemove,
          startIcon: <Delete />,
          loading: props?.removeLoading,
          color: "error",
        })
      } else {
        buttons.push({
          label: "Delete",
          startIcon: <Delete />,
          onClick: props?.onDelete,
          loading: props?.deleteLoading,
          color: "error",
        })
      }
    }

    // Submit (new badge) or Update (existing badge) button.
    buttons.push({
      label: typeof props?.isEdit !== "boolean" ? "Update" : "Submit",
      startIcon: typeof props?.isEdit !== "boolean" ? <Update /> : <ArrowUpward />,
      onClick: props?.onSubmit,
      loading: props?.loading,
      disabled: props?.canSubmit === false,
    })

    return { buttons }
  },

  getMode(props?: BadgeToolbarProps): ViewMode {
    return props?.isEdit ? "edit" : "browse"
  },
}
