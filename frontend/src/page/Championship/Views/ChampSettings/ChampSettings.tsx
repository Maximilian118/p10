import React from "react"
import "./_champSettings.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { Button } from "@mui/material"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"

// View type for the Championship page.
export type ChampView = "competitors" | "settings" | "deleteChamp"

interface ChampSettingsProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
}

// Championship settings component - displays settings and delete option.
const ChampSettings: React.FC<ChampSettingsProps> = ({
  champ,
  user,
  setView,
}) => {
  // Check if user has permission to delete (admin or adjudicator).
  const isAdmin = user.permissions?.admin === true
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const canDelete = isAdmin || isAdjudicator

  return (
    <div className="champ-settings">
      <div className="champ-settings__header">
        <h2>Championship Settings</h2>
      </div>

      <div className="champ-settings__content">
        <p className="champ-settings__placeholder">
          More settings coming soon...
        </p>
      </div>

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
