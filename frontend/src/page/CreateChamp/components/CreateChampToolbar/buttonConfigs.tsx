import React from "react"
import { ArrowBack, Delete, ArrowUpward, Update, EmojiEvents } from "@mui/icons-material"
import { ButtonConfig } from "../../../../components/utility/buttonBar/ButtonBar"
import { FormHandlers } from "../../../../context/ChampFlowContext"
import Arrows from "../../../../components/utility/arrows/Arrows"
import { CreateChampToolbarProps } from "./types"

// Creates the back button configuration.
export const getBackButton = (props: CreateChampToolbarProps): ButtonConfig => {
  const { activeStep, activeFormHandlers, onStepChange } = props
  const isFirstStep = activeStep === 0

  return {
    label: "Back",
    onClick: () => {
      if (activeFormHandlers) {
        activeFormHandlers.back()
      } else {
        onStepChange(activeStep - 1)
      }
    },
    startIcon: <ArrowBack />,
    color: "inherit",
    disabled: isFirstStep && !activeFormHandlers,
  }
}

// Creates the delete button configuration (only for nested form editing).
export const getDeleteButton = (handlers: FormHandlers | null): ButtonConfig | null => {
  if (!handlers?.canDelete || !handlers?.isEditing) {
    return null
  }

  return {
    label: "Delete",
    onClick: handlers.onDelete,
    startIcon: <Delete />,
    color: "error",
    loading: handlers.delLoading,
  }
}

// Creates the remove button configuration (only for nested form editing).
export const getRemoveButton = (handlers: FormHandlers | null): ButtonConfig | null => {
  if (!handlers?.canRemove || !handlers?.isEditing) {
    return null
  }

  return {
    label: "Remove",
    onClick: handlers.onRemove,
    startIcon: <Delete />,
    color: "error",
  }
}

// Creates the main action button (Next/Submit/Update/Create Championship).
export const getMainButton = (props: CreateChampToolbarProps): ButtonConfig => {
  const { activeStep, totalSteps, activeFormHandlers, loading, onStepChange, onSubmitForm } = props
  const isLastStep = activeStep === totalSteps

  // Determine button label based on context.
  const getLabel = (): string => {
    if (activeFormHandlers) {
      return activeFormHandlers.isEditing ? "Update" : "Submit"
    }
    return isLastStep ? "Create Championship" : "Next"
  }

  // Determine start icon based on context.
  const getStartIcon = (): React.ReactNode => {
    if (activeFormHandlers) {
      return activeFormHandlers.isEditing ? <Update /> : <ArrowUpward />
    }
    return isLastStep ? <EmojiEvents /> : undefined
  }

  // Determine end icon (arrows for navigation steps).
  const getEndIcon = (): React.ReactNode => {
    if (!activeFormHandlers && !isLastStep) {
      return <Arrows />
    }
    return undefined
  }

  // Handle button click.
  const handleClick = (): void => {
    if (activeFormHandlers) {
      activeFormHandlers.submit()
    } else if (isLastStep) {
      onSubmitForm()
    } else {
      onStepChange(activeStep + 1)
    }
  }

  return {
    label: getLabel(),
    onClick: handleClick,
    startIcon: getStartIcon(),
    endIcon: getEndIcon(),
    loading: activeFormHandlers?.loading || loading,
    disabled: activeFormHandlers ? !activeFormHandlers.canSubmit : false,
  }
}

// Builds the complete buttons array for the toolbar.
export const buildButtons = (props: CreateChampToolbarProps): ButtonConfig[] => {
  const buttons: ButtonConfig[] = [getBackButton(props)]

  const deleteBtn = getDeleteButton(props.activeFormHandlers)
  if (deleteBtn) {
    buttons.push(deleteBtn)
  }

  const removeBtn = getRemoveButton(props.activeFormHandlers)
  if (removeBtn) {
    buttons.push(removeBtn)
  }

  buttons.push(getMainButton(props))

  return buttons
}
