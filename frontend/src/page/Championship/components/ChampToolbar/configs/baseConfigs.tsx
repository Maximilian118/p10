import React from "react"
import { ArrowBack, Save, FilterList, Add } from "@mui/icons-material"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"

// Creates a standard back button.
export const createBackButton = (onClick?: () => void): ButtonConfig => ({
  label: "Back",
  onClick,
  startIcon: <ArrowBack />,
  color: "inherit",
})

// Creates a views drawer button.
export const createViewsButton = (onClick?: () => void): ButtonConfig => ({
  label: "Views",
  onClick,
  endIcon: <FilterList />,
})

// Creates a save button for form views.
export const createSaveButton = (
  onSubmit?: () => void,
  disabled?: boolean,
  loading?: boolean
): ButtonConfig => ({
  label: "Save",
  onClick: onSubmit,
  startIcon: <Save />,
  disabled,
  loading,
  color: "success",
})

// Creates an add button (icon only).
export const createAddButton = (onClick?: () => void): ButtonConfig => ({
  onClick,
  endIcon: <Add />,
  className: "button-medium add-button",
  color: "success",
})

// Creates a filter button.
export const createFilterButton = (onClick?: () => void): ButtonConfig => ({
  label: "Filter",
  onClick,
  endIcon: <FilterList />,
})
