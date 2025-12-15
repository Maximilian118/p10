import React from "react"
import { useNavigate } from "react-router-dom"
import './_champToolbar.scss'
import { Button } from "@mui/material"
import { FilterList, GroupAdd, Lock, Block } from "@mui/icons-material"
import { ChampType } from "../../../shared/types"
import { getCompetitors } from "../../../shared/utility"
import { userType } from "../../../shared/localStorage"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { joinChamp } from "../../../shared/requests/champRequests"

interface champToolbarType {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onJoinSuccess?: () => void
  onDrawerClick?: () => void
  style?: React.CSSProperties
}

// Toolbar with action buttons for the championship page.
const ChampToolbar: React.FC<champToolbarType> = ({ champ, setChamp, user, setUser, setBackendErr, onJoinSuccess, onDrawerClick, style }) => {
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

  return (
    <div className="champ-toolbar" style={style}>
      {renderJoinButton()}
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
    </div>
  )
}

export default ChampToolbar
