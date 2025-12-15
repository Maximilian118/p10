import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import './_team.scss'
import { teamType } from "../../shared/types"
import EditButton from "../../components/utility/button/editButton/EditButton"

// Team profile page.
const Team: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Check if team was passed via navigation state.
  const locationTeam = (location.state as { team?: teamType })?.team

  const [ team ] = useState<teamType | null>(locationTeam || null)

  // Navigate to edit form with team data.
  const handleEdit = () => {
    navigate("/create-team", { state: { team } })
  }

  return (
    <div className="content-container team-profile">
      <EditButton
        onClick={handleEdit}
        size="medium"
        absolute
      />
    </div>
  )
}

export default Team
