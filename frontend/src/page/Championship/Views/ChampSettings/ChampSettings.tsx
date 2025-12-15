import React, { useState } from "react"
import { NavigateFunction } from "react-router-dom"
import "./_champSettings.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { deleteChamp } from "../../../../shared/requests/champRequests"
import { Button, TextField } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"

// View type for the Championship page.
export type ChampView = "competitors" | "settings"

interface ChampSettingsProps {
  champ: ChampType
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setView: React.Dispatch<React.SetStateAction<ChampView>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Championship settings component - displays settings and delete option.
const ChampSettings: React.FC<ChampSettingsProps> = ({
  champ,
  user,
  setUser,
  navigate,
  setView,
  setBackendErr,
}) => {
  const [confirmName, setConfirmName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  // Check if user has permission to delete (admin or adjudicator).
  const isAdmin = user.permissions?.admin === true
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const canDelete = isAdmin || isAdjudicator

  // Check if the entered name matches the championship name.
  const nameMatches = confirmName === champ.name

  // Handle delete action.
  const handleDelete = async () => {
    if (!nameMatches || loading) return

    setLoading(true)

    const result = await deleteChamp(
      champ._id,
      confirmName,
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    setLoading(false)

    if (result) {
      navigate("/championships")
    }
  }

  return (
    <div className="champ-settings">
      <div className="champ-settings__header">
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => setView("competitors")}
          className="champ-settings__back-btn"
        >
          Back to Competitors
        </Button>
        <h2>Championship Settings</h2>
      </div>

      <div className="champ-settings__content">
        <p className="champ-settings__placeholder">
          More settings coming soon...
        </p>
      </div>

      {canDelete && (
        <div className="champ-settings__danger-zone">
          <h3>Danger Zone</h3>
          <p>
            Deleting this championship is permanent and cannot be undone.
            All rounds, competitor data, and protests will be deleted.
            Badges earned by competitors will remain on their profiles.
          </p>
          <p className="champ-settings__confirm-label">
            Type <strong>{champ.name}</strong> to confirm:
          </p>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Enter championship name"
            disabled={loading}
            autoComplete="off"
            className="champ-settings__input"
          />
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={!nameMatches || loading}
            className="champ-settings__delete-btn"
          >
            {loading ? "Deleting..." : "Delete Championship"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ChampSettings
