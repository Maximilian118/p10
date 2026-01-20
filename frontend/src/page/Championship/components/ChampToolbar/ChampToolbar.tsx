import React from "react"
import { useNavigate } from "react-router-dom"
import './_champToolbar.scss'
import { FilterList, GroupAdd, Lock, Block, ArrowBack, Save, Add } from "@mui/icons-material"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { joinChamp } from "../../../../shared/requests/champRequests"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"
import FloatingButtonBar, { FloatingButtonConfig } from "../../../../components/utility/floatingButtonBar/FloatingButtonBar"

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

  // Get join/invite button config based on championship state.
  const getJoinButtonConfig = (): FloatingButtonConfig | undefined => {
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
        className: "champ-toolbar-join",
      }
    }

    // Invite only championship.
    if (isAdjudicator) {
      if (isFull) {
        return { label: "Championship Full", endIcon: <Block />, disabled: true }
      }
      return {
        label: "Invite Competitors",
        onClick: () => {},
        endIcon: <GroupAdd />,
        className: "champ-toolbar-join",
      }
    }

    if (isCompetitor) return undefined
    return { label: "Invite Only", endIcon: <Lock />, disabled: true }
  }

  // Back button config used across multiple views.
  const getBackButton = (): FloatingButtonConfig => {
    const backHandler = view === "badges" && badgeProps?.isEdit && badgeProps?.onBack
      ? badgeProps.onBack
      : onBack
    return {
      label: "Back",
      onClick: backHandler,
      startIcon: <ArrowBack />,
      className: "champ-toolbar-back",
      color: "inherit",
    }
  }

  // Badges view (not edit mode) - uses grouped layout.
  if (view === "badges" && !badgeProps?.isEdit) {
    const rightButtons: FloatingButtonConfig[] = [
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
      <FloatingButtonBar
        leftButtons={[getBackButton()]}
        rightButtons={rightButtons}
      />
    )
  }

  // Build buttons array for other views.
  const getButtons = (): FloatingButtonConfig[] => {
    const buttons: FloatingButtonConfig[] = []

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
        className: "champ-toolbar-save",
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

  return <FloatingButtonBar buttons={getButtons()} />
}

export default ChampToolbar
