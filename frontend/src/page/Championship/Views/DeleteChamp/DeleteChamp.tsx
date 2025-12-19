import React, { useState } from "react"
import { NavigateFunction } from "react-router-dom"
import "./_deleteChamp.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { deleteChamp } from "../../../../shared/requests/champRequests"
import { Button, TextField } from "@mui/material"
import WarningIcon from "@mui/icons-material/Warning"

interface DeleteChampProps {
  champ: ChampType
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Delete championship view - red background with warning and confirmation.
const DeleteChamp: React.FC<DeleteChampProps> = ({
  champ,
  user,
  setUser,
  navigate,
  setBackendErr,
}) => {
  const [confirmName, setConfirmName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

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
    <div className="delete-champ">
      <div className="delete-champ__warning">
        <WarningIcon className="delete-champ__icon" />
        <h2>Delete Championship</h2>
      </div>
      <div className="delete-champ__content">
        <p>
          Deleting this championship is <strong>permanent</strong> and cannot be undone.
        </p>
        <p>
          All rounds, competitor data, and protests will be deleted.
        </p>
        <p>
          Badges earned by competitors will remain on their profiles.
        </p>
      </div>
      <div className="delete-champ__confirm">
        <p>
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
          className="delete-champ__input"
        />
        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={!nameMatches || loading}
          className="delete-champ__btn"
        >
          {loading ? "Deleting..." : "Confirm Delete"}
        </Button>
      </div>
    </div>
  )
}

export default DeleteChamp
