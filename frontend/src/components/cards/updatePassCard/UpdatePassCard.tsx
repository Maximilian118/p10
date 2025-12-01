import React from "react"
import './_updatePassCard.scss'
import { useNavigate } from "react-router-dom"
import { Button } from "@mui/material"

const UpdatePassCard: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="update-pass-card">
      <Button
        variant="contained"
        onClick={() => navigate("/password")}
      >Change Password</Button>
    </div>
  )
}

export default UpdatePassCard
