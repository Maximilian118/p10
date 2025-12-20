import React from "react"
import { NavigateFunction } from "react-router-dom"
import "./_champSettings.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { updateChampSettings } from "../../../../shared/requests/champRequests"
import { Button } from "@mui/material"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"
import Toggle from "../../../../components/utility/toggle/Toggle"
import UpdateChampName from "./settingsComponents/UpdateChampName"

// View type for the Championship page.
export type ChampView = "competitors" | "settings" | "deleteChamp"

interface ChampSettingsProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setView: (view: ChampView) => void
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Championship settings component - displays settings and delete option.
const ChampSettings: React.FC<ChampSettingsProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  navigate,
  setView,
  setBackendErr,
}) => {
  // Check if user has permission to delete (admin or adjudicator).
  const isAdmin = user.permissions?.admin === true
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const canDelete = isAdmin || isAdjudicator

  // Handle invite only toggle change with optimistic update.
  const handleInviteOnlyChange = async (checked: boolean) => {
    const previousValue = champ.settings.inviteOnly

    // Optimistically update the UI.
    setChamp(prev => prev ? {
      ...prev,
      settings: { ...prev.settings, inviteOnly: checked }
    } : null)

    // Send request to backend.
    const success = await updateChampSettings(
      champ._id,
      { inviteOnly: checked },
      setChamp,
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    // Revert on failure.
    if (!success) {
      setChamp(prev => prev ? {
        ...prev,
        settings: { ...prev.settings, inviteOnly: previousValue }
      } : null)
    }
  }

  return (
    <div className="champ-settings">
      <UpdateChampName
        champ={champ}
        setChamp={setChamp}
        user={user}
        setUser={setUser}
        navigate={navigate}
        setBackendErr={setBackendErr}
      />
      <Toggle
        text="Invite Only"
        checked={champ.settings.inviteOnly}
        onChange={handleInviteOnlyChange}
      />

      {canDelete && (
        <Button
          variant="contained"
          className="champ-settings__delete-btn"
          onClick={() => setView("deleteChamp")}
          startIcon={<DeleteForeverIcon />}
        >
          Delete Championship
        </Button>
      )}
    </div>
  )
}

export default ChampSettings
