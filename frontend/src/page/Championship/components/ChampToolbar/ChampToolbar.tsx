import React from "react"
import { useNavigate } from "react-router-dom"
import './_champToolbar.scss'
import { Button, CircularProgress } from "@mui/material"
import { FilterList, GroupAdd, Lock, Block, ArrowBack, Save } from "@mui/icons-material"
import { ChampType, badgeType } from "../../../../shared/types"
import { getCompetitors } from "../../../../shared/utility"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { joinChamp } from "../../../../shared/requests/champRequests"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"
import AddButton from "../../../../components/utility/button/addButton/AddButton"

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
  style?: React.CSSProperties
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
  style,
  settingsProps,
  automationProps,
  protestsProps,
  ruleChangesProps,
  adminProps,
  badgeProps,
}) => {
  const navigate = useNavigate()

  // Check if user is already a competitor in the championship.
  const competitors = getCompetitors(champ)
  const isCompetitor = competitors.some(c => c.competitor._id === user._id)

  // Check if user is the adjudicator.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id

  // Check if championship has reached max competitors.
  const isFull = competitors.length >= champ.settings.maxCompetitors

  // Determine which join/invite button to render.
  const renderJoinButton = () => {
    // Championship is NOT invite only.
    if (!champ.settings.inviteOnly) {
      // User is already a competitor - no join button needed.
      if (isCompetitor) return null

      if (isFull) {
        return (
          <Button
            variant="contained"
            size="small"
            disabled
            endIcon={<Block />}
          >
            Championship Full
          </Button>
        )
      }
      return (
        <Button
          variant="contained"
          size="small"
          className="champ-toolbar-join"
          onClick={async e => {
            e.stopPropagation()
            const success = await joinChamp(champ._id, setChamp, user, setUser, navigate, setBackendErr)
            if (success && onJoinSuccess) {
              onJoinSuccess()
            }
          }}
          endIcon={<GroupAdd />}
        >
          Join Championship
        </Button>
      )
    }

    // Championship IS invite only.
    // Adjudicator always sees invite button (regardless of competitor status).
    if (isAdjudicator) {
      if (isFull) {
        return (
          <Button
            variant="contained"
            size="small"
            disabled
            endIcon={<Block />}
          >
            Championship Full
          </Button>
        )
      }
      return (
        <Button
          variant="contained"
          size="small"
          className="champ-toolbar-join"
          onClick={e => {
            e.stopPropagation()
          }}
          endIcon={<GroupAdd />}
        >
          Invite Competitors
        </Button>
      )
    }

    // User is not the adjudicator - if already a competitor, no button needed.
    if (isCompetitor) return null

    // User is not the adjudicator and not a competitor - show disabled invite only button.
    return (
      <Button
        variant="contained"
        size="small"
        disabled
        endIcon={<Lock />}
      >
        Invite Only
      </Button>
    )
  }

  // Render save button for form views.
  const renderSaveButton = (props: FormToolbarProps | undefined) => {
    if (!props?.onSubmit) return null
    return (
      <Button
        variant="contained"
        size="small"
        className="champ-toolbar-save"
        onClick={e => {
          e.stopPropagation()
          props.onSubmit!()
        }}
        disabled={!props.loading && (!props.changed || Object.values(props.formErr || {}).some(err => !!err))}
        startIcon={props.loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
      >
        Save
      </Button>
    )
  }

  return (
    <div className="champ-toolbar" style={style}>
      {/* Back button - uses badgeProps.onBack in badge edit mode, onBack otherwise */}
      {view !== "competitors" && (
        <Button
          variant="contained"
          size="small"
          className="champ-toolbar-back"
          onClick={e => {
            e.stopPropagation()
            if (view === "badges" && badgeProps?.isEdit && badgeProps?.onBack) {
              badgeProps.onBack()
            } else if (onBack) {
              onBack()
            }
          }}
          startIcon={<ArrowBack />}
        >
          Back
        </Button>
      )}
      {view === "competitors" && renderJoinButton()}
      {(view === "settings" || view === "series") && renderSaveButton(settingsProps)}
      {view === "automation" && renderSaveButton(automationProps)}
      {view === "protests" && renderSaveButton(protestsProps)}
      {view === "ruleChanges" && renderSaveButton(ruleChangesProps)}
      {view === "admin" && renderSaveButton(adminProps)}
      {/* Badge view buttons - Add and Filter (only for adjudicators, not in edit mode) */}
      {view === "badges" && !badgeProps?.isEdit && (
        <div className="badge-buttons">
          <Button
            variant="contained"
            size="small"
            onClick={e => {
              e.stopPropagation()
              if (badgeProps?.onFilter) {
                badgeProps.onFilter()
              }
            }}
            endIcon={<FilterList />}
          >
            Filter
          </Button>
          {isAdjudicator && <AddButton onClick={() => badgeProps?.onAdd && badgeProps.onAdd()} />}
        </div>
      )}
      {/* Badge edit mode - Delete and Submit/Update buttons on the right */}
      {view === "badges" && badgeProps?.isEdit && (
        <>
          {typeof badgeProps.isEdit !== "boolean" && (
            <Button
              variant="contained"
              size="small"
              color="error"
              onClick={e => {
                e.stopPropagation()
                if (badgeProps?.onDelete) {
                  badgeProps.onDelete()
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={e => {
              e.stopPropagation()
              if (badgeProps?.onSubmit) {
                badgeProps.onSubmit()
              }
            }}
            startIcon={badgeProps?.loading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {typeof badgeProps.isEdit !== "boolean" ? "Update" : "Submit"}
          </Button>
        </>
      )}
      {/* Views button - hidden in badges view */}
      {view !== "badges" && (
        <Button
          variant="contained"
          size="small"
          onClick={e => {
            e.stopPropagation()
            if (onDrawerClick) {
              onDrawerClick()
            }
          }}
          endIcon={<FilterList />}
        >
          Views
        </Button>
      )}
    </div>
  )
}

export default ChampToolbar
