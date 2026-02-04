import React from "react"
import { NavigateFunction } from "react-router-dom"
import { ButtonConfig } from "../../../../components/utility/buttonBar/ButtonBar"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"

// View mode for views with multiple states.
export type ViewMode = "browse" | "edit" | "create" | "deleteConfirm"

// Result from a toolbar strategy - what buttons to display.
export interface ToolbarConfig {
  // Flat layout - single array of buttons.
  buttons?: ButtonConfig[]
  // Grouped layout - buttons split into left and right groups.
  leftButtons?: ButtonConfig[]
  rightButtons?: ButtonConfig[]
}

// Context passed to all toolbar strategies with common data and handlers.
export interface ToolbarContext {
  // Core data.
  champ: ChampType
  user: userType
  view: ChampView

  // Pre-computed permissions.
  isAdjudicator: boolean
  isAdmin: boolean
  isCompetitor: boolean
  isBanned: boolean
  isInvited: boolean
  isFull: boolean

  // Navigation.
  navigate: NavigateFunction
  onBack?: () => void
  navigateToView?: (view: ChampView) => void
  onDrawerClick?: () => void

  // State setters.
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>

  // Confirmation dialogs.
  setShowInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
  setShowAcceptInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
}

// Strategy interface - each view implements this to define its toolbar configuration.
export interface ToolbarStrategy {
  // Returns button config for this view given context and mode.
  getConfig(
    context: ToolbarContext,
    mode: ViewMode,
    props?: unknown,
    extraConfig?: ButtonConfig
  ): ToolbarConfig

  // Compute mode from view-specific props.
  getMode?(props: unknown): ViewMode
}

// Props for form views (settings, automation, protests, ruleChanges, admin).
export interface FormToolbarProps {
  formErr?: Record<string, string>
  onSubmit?: () => void
  changed?: boolean
  loading?: boolean
}

// Props for badge view.
export interface BadgeToolbarProps {
  onAdd?: () => void
  onFilter?: () => void
  isEdit?: boolean | badgeType
  onBack?: () => void
  onDelete?: () => void
  onRemove?: () => void
  onSubmit?: () => void
  loading?: boolean
  deleteLoading?: boolean
  removeLoading?: boolean
  canSubmit?: boolean
  canRemove?: boolean
}

// Props for rules and regs view.
export interface RulesAndRegsToolbarProps {
  onAdd?: () => void
  isEdit?: boolean
  isNewRule?: boolean
  onBack?: () => void
  onDelete?: () => void
  onSubmit?: () => void
  loading?: boolean
  deleteLoading?: boolean
  canSubmit?: boolean
  delConfirm?: boolean
  onDelConfirmBack?: () => void
}

// Props for competitors view.
export interface CompetitorsToolbarProps {
  adjudicatorView?: boolean
  onExitAdjudicatorView?: () => void
}

// Props for protests view.
export interface ProtestsToolbarProps {
  onCreateProtest?: () => void
  canCreateProtest?: boolean
  isCreating?: boolean
  onCancelCreate?: () => void
  onSubmitCreate?: () => void
  createLoading?: boolean
}
