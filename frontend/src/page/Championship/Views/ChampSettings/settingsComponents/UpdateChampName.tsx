import React, { useState } from "react"
import { NavigateFunction } from "react-router-dom"
import "./_updateChampName.scss"
import { ChampType } from "../../../../../shared/types"
import { userType } from "../../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../../shared/requests/requestsUtility"
import { updateChampSettings } from "../../../../../shared/requests/champRequests"
import { Button, CircularProgress, TextField } from "@mui/material"

interface UpdateChampNameProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Component for updating championship name.
const UpdateChampName: React.FC<UpdateChampNameProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  navigate,
  setBackendErr,
}) => {
  const [name, setName] = useState<string>(champ.name)
  const [loading, setLoading] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  // Check if name has changed from original.
  const hasChanged = name !== champ.name && name.trim() !== ""

  // Handle name update.
  const handleUpdate = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (!hasChanged || loading) return

    setLoading(true)
    setError("")

    const result = await updateChampSettings(
      champ._id,
      { name: name.trim() },
      setChamp,
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    setLoading(false)

    if (result) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } else {
      setError("Failed to update name")
    }
  }

  return (
    <form className="update-champ-name">
      <TextField
        className="mui-form-el"
        name="champName"
        label={error || "Championship Name"}
        variant="filled"
        inputProps={{ maxLength: 50 }}
        onChange={e => {
          setName(e.target.value)
          setSuccess(false)
          setError("")
        }}
        value={name}
        error={!!error}
        color={success ? "success" : "primary"}
      />
      <Button
        variant="contained"
        type="submit"
        style={{ flexShrink: 0 }}
        startIcon={loading && <CircularProgress size={20} color="inherit" />}
        onClick={handleUpdate}
        disabled={!hasChanged || loading}
        color={success ? "success" : "primary"}
      >
        {success ? "Updated!" : "Update"}
      </Button>
    </form>
  )
}

export default UpdateChampName
