import React from "react"
import { useNavigate } from "react-router-dom"
import './_champToolbar.scss'
import { FilterList, GroupAdd, Lock, Block, ArrowBack, Save, Add, CheckCircle } from "@mui/icons-material"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { joinChamp } from "../../../../shared/requests/champRequests"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"
import ButtonBar, { ButtonConfig } from "../../../../components/utility/buttonBar/ButtonBar"

// Grouped props for form views (settings, automation, protests, ruleChanges, admin).
export interface FormToolbarProps {
  formErr?: Record<string, string>
  onSubmit?: () => void
  changed?: boolean
  loading?: boolean
}

// Grouped props for badge view.
export interface BadgeToolbarProps {
  onAdd?: () => void
  onFilter?: () => void
  isEdit?: boolean | badgeType
  onBack?: () => void
  onDelete?: () => void
  onSubmit?: () => void
  loading?: boolean
}

interface champToolbarType {
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
}

// Toolbar with action buttons for the championship page.
const ChampToolbar: React.FC<champToolbarType> = ({
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
}) => {
  const navigate = useNavigate()

  // Check if user is already a competitor in the championship.
  const competitors = champ.competitors
  const isCompetitor = competitors.some(c => c._id === user._id)

  // Check if user is the adjudicator.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id

  // Check if championship has reached max competitors.
  const isFull = competitors.length >= champ.settings.maxCompetitors

  // Form views that use the save button pattern.
  const formViews: ChampView[] = ["settings", "series", "automation", "protests", "ruleChanges", "admin"]
  const isFormView = formViews.includes(view)

  // Get form props based on current view.
  const getFormProps = (): FormToolbarProps | undefined => {
    if (view === "settings" || view === "series") return settingsProps
    if (view === "automation") return automationProps
    if (view === "protests") return protestsProps
    if (view === "ruleChanges") return ruleChangesProps
    if (view === "admin") return adminProps
    return undefined
  }

  const formProps = getFormProps()

  // Check if save button should be disabled (no changes or form errors).
  const isSaveDisabled = !formProps?.loading && (
    !formProps?.changed ||
    Object.values(formProps?.formErr || {}).some(err => !!err)
  )

  // Check if user is banned from this championship.
  const isBanned = champ.banned?.some(b => b._id === user._id)

  // Check if user is invited to this championship.
  const isInvited = champ.invited?.some(i => i._id === user._id)

  // Get join/invite button config based on championship state.
  const getJoinButtonConfig = (): ButtonConfig | undefined => {
    // Show "You are banned" button if user is banned.
    if (isBanned) {
      return {
        label: "You are banned",
        endIcon: <Block />,
        color: "error",
        disabled: true,
      }
    }

    if (!champ.settings.inviteOnly) {
      if (isCompetitor) return undefined
      if (isFull) {
        return { label: "Championship Full", endIcon: <Block />, disabled: true }
      }
      return {
        label: "Join Championship",
        onClick: async () => {
          const success = await joinChamp(champ._id, setChamp, user, setUser, navigate, setBackendErr)
          if (success && onJoinSuccess) onJoinSuccess()
        },
        endIcon: <GroupAdd />,
        color: "success",
      }
    }

    // Invite only championship.
    if (isAdjudicator) {
      return {
        label: "Invite Competitors",
        onClick: () => {
          if (isFull && setShowInviteFullConfirm) {
            setShowInviteFullConfirm(true)
          } else if (navigateToView) {
            navigateToView("invite")
          }
        },
        endIcon: <GroupAdd />,
        color: "success",
      }
    }

    // Show "Accept Invite" button for invited users.
    if (isInvited) {
      return {
        label: "Accept Invite",
        onClick: async () => {
          if (isFull && setShowAcceptInviteFullConfirm) {
            setShowAcceptInviteFullConfirm(true)
          } else {
            const success = await joinChamp(champ._id, setChamp, user, setUser, navigate, setBackendErr)
            if (success && onJoinSuccess) onJoinSuccess()
          }
        },
        endIcon: <CheckCircle />,
        color: "success",
      }
    }

    if (isCompetitor) return undefined
    return { label: "Invite Only", endIcon: <Lock />, disabled: true }
  }

  // Back button config used across multiple views.
  const getBackButton = (): ButtonConfig => {
    const backHandler = view === "badges" && badgeProps?.isEdit && badgeProps?.onBack
      ? badgeProps.onBack
      : onBack
    return {
      label: "Back",
      onClick: backHandler,
      startIcon: <ArrowBack />,
      color: "inherit",
    }
  }

  // Adjudicator view on competitors - simplified toolbar (back + views only).
  if (view === "competitors" && adjudicatorView) {
    return (
      <ButtonBar
        leftButtons={[{
          label: "Back",
          onClick: onExitAdjudicatorView,
          startIcon: <ArrowBack />,
          color: "inherit",
        }]}
        rightButtons={[{ label: "Views", onClick: onDrawerClick, endIcon: <FilterList /> }]}
      />
    )
  }

  // Badges view (not edit mode) - uses grouped layout.
  if (view === "badges" && !badgeProps?.isEdit) {
    const rightButtons: ButtonConfig[] = [
      { label: "Filter", onClick: badgeProps?.onFilter, endIcon: <FilterList /> },
    ]
    if (isAdjudicator) {
      rightButtons.push({
        onClick: badgeProps?.onAdd,
        endIcon: <Add />,
        className: "button-medium add-button",
        color: "success",
      })
    }
    return (
      <ButtonBar
        leftButtons={[getBackButton()]}
        rightButtons={rightButtons}
      />
    )
  }

  // Build buttons array for other views.
  const getButtons = (): ButtonConfig[] => {
    const buttons: ButtonConfig[] = []

    // Back button - all views except competitors.
    if (view !== "competitors") {
      buttons.push(getBackButton())
    }

    // Competitors view - Join/Invite button.
    if (view === "competitors") {
      const joinConfig = getJoinButtonConfig()
      if (joinConfig) buttons.push(joinConfig)
    }

    // Form views - Save button.
    if (isFormView) {
      buttons.push({
        label: "Save",
        onClick: formProps?.onSubmit,
        startIcon: <Save />,
        disabled: isSaveDisabled,
        loading: formProps?.loading,
        color: "success",
      })
    }

    // Badges edit mode - Delete and Submit/Update buttons.
    if (view === "badges" && badgeProps?.isEdit) {
      if (typeof badgeProps.isEdit !== "boolean") {
        buttons.push({
          label: "Delete",
          onClick: badgeProps?.onDelete,
          color: "error",
        })
      }
      buttons.push({
        label: typeof badgeProps.isEdit !== "boolean" ? "Update" : "Submit",
        onClick: badgeProps?.onSubmit,
        loading: badgeProps?.loading,
      })
    }

    // Views button - all views except badges.
    if (view !== "badges") {
      buttons.push({
        label: "Views",
        onClick: onDrawerClick,
        endIcon: <FilterList />,
      })
    }

    return buttons
  }

  return <ButtonBar buttons={getButtons()} />
}

export default ChampToolbar
