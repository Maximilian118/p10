import React from "react"
import { useNavigate } from "react-router-dom"
import "./_champToolbar.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"
import ButtonBar from "../../../../components/utility/buttonBar/ButtonBar"
import { getStrategy } from "./configs"
import { useJoinButton } from "./hooks/useJoinButton"
import {
  ToolbarContext,
  FormToolbarProps,
  BadgeToolbarProps,
  RulesAndRegsToolbarProps,
  CompetitorsToolbarProps,
} from "./types"

// Re-export types for backward compatibility.
export type { FormToolbarProps, BadgeToolbarProps, RulesAndRegsToolbarProps }

interface ChampToolbarProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  view: ChampView
  onBack?: () => void
  onJoinSuccess?: () => void
  onDrawerClick?: () => void
  adjudicatorView?: boolean
  onExitAdjudicatorView?: () => void
  navigateToView?: (view: ChampView) => void
  setShowInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
  setShowAcceptInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
  settingsProps?: FormToolbarProps
  automationProps?: FormToolbarProps
  protestsProps?: FormToolbarProps
  ruleChangesProps?: FormToolbarProps
  adminProps?: FormToolbarProps
  badgeProps?: BadgeToolbarProps
  rulesAndRegsProps?: RulesAndRegsToolbarProps
}

// Toolbar with action buttons for the championship page.
const ChampToolbar: React.FC<ChampToolbarProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  setBackendErr,
  view,
  onBack,
  onJoinSuccess,
  onDrawerClick,
  adjudicatorView,
  onExitAdjudicatorView,
  navigateToView,
  setShowInviteFullConfirm,
  setShowAcceptInviteFullConfirm,
  settingsProps,
  automationProps,
  protestsProps,
  ruleChangesProps,
  adminProps,
  badgeProps,
  rulesAndRegsProps,
}) => {
  const navigate = useNavigate()

  // Use hook for complex join button logic.
  const { buttonConfig: joinButtonConfig } = useJoinButton({
    champ,
    setChamp,
    user,
    setUser,
    navigate,
    setBackendErr,
    navigateToView,
    setShowInviteFullConfirm,
    setShowAcceptInviteFullConfirm,
    onJoinSuccess,
  })

  // Build context with pre-computed permissions.
  const context: ToolbarContext = {
    champ,
    user,
    view,
    isAdjudicator: champ.adjudicator?.current?._id === user._id,
    isAdmin: user.permissions?.admin === true,
    isCompetitor: champ.competitors.some((c) => c._id === user._id),
    isBanned: champ.banned?.some((b) => b._id === user._id) ?? false,
    isInvited: champ.invited?.some((i) => i._id === user._id) ?? false,
    isFull: champ.competitors.length >= champ.settings.maxCompetitors,
    navigate,
    onBack,
    navigateToView,
    onDrawerClick,
    setChamp,
    setUser,
    setBackendErr,
    setShowInviteFullConfirm,
    setShowAcceptInviteFullConfirm,
  }

  // Get strategy for current view.
  const strategy = getStrategy(view)

  // Get view-specific props based on current view.
  const getViewProps = (): unknown => {
    switch (view) {
      case "competitors":
        return { adjudicatorView, onExitAdjudicatorView } as CompetitorsToolbarProps
      case "badges":
        return badgeProps
      case "rulesAndRegs":
        return rulesAndRegsProps
      case "settings":
      case "series":
      case "automation":
      case "protests":
      case "ruleChanges":
      case "admin":
        return { settingsProps, automationProps, protestsProps, ruleChangesProps, adminProps }
      default:
        return undefined
    }
  }

  const viewProps = getViewProps()

  // Compute mode from view-specific props.
  const mode = strategy.getMode?.(viewProps) ?? "browse"

  // Get button config from strategy.
  const config =
    view === "competitors"
      ? strategy.getConfig(context, mode, viewProps, joinButtonConfig)
      : strategy.getConfig(context, mode, viewProps)

  // Render ButtonBar with appropriate layout.
  if (config.leftButtons || config.rightButtons) {
    return <ButtonBar leftButtons={config.leftButtons} rightButtons={config.rightButtons} />
  }

  return <ButtonBar buttons={config.buttons} />
}

export default ChampToolbar
