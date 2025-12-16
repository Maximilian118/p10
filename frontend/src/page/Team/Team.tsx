import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import './_team.scss'
import { teamType } from "../../shared/types"
import EditButton from "../../components/utility/button/editButton/EditButton"
import AppContext from "../../context"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getContrastTextColor } from "../../shared/utils/colorUtils"
import { getTeamById } from "../../shared/requests/teamRequests"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"

// Team profile page.
const Team: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if team was passed via navigation state.
  const locationTeam = (location.state as { team?: teamType })?.team

  const [team, setTeam] = useState<teamType | null>(locationTeam || null)
  const [loading, setLoading] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Always fetch team by ID to get fresh data with dominantColour.
  useEffect(() => {
    if (id) {
      getTeamById(id, setTeam, user, setUser, navigate, setLoading, setBackendErr)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Navigate to edit form with team data.
  const handleEdit = () => {
    navigate("/create-team", { state: { team } })
  }

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container team-profile">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message || !team) {
    return (
      <div className="content-container team-profile">
        <ErrorDisplay backendErr={backendErr.message ? backendErr : { ...initGraphQLError, message: "Team not found" }} />
      </div>
    )
  }

  // Determine text color based on background luminance.
  const textColor = team.dominantColour
    ? getContrastTextColor(team.dominantColour)
    : 'white'

  return (
    <div
      className="content-container team-profile"
      style={{
        background: team.dominantColour || '',
        color: textColor
      }}
    >
      <img alt={team.name} src={team.emblem} className="team-emblem"/>
      <div className="team-profile-content">
        <h2>{team.name}</h2>
      </div>
      <EditButton
        onClick={handleEdit}
        size="medium"
        absolute
      />
    </div>
  )
}

export default Team
