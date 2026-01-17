import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ResponsiveLine } from "@nivo/line"
import './_team.scss'
import { driverType, teamType } from "../../shared/types"
import EditButton from "../../components/utility/button/editButton/EditButton"
import AppContext from "../../context"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getContrastTextColor } from "../../shared/utils/colorUtils"
import { getTeamById } from "../../shared/requests/teamRequests"
import { createdByID } from "../../shared/utility"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import IconList from "../../components/utility/iconList/IconList"
import {
  getP10Finishes,
  getBestStreak,
  getRunnerUps,
  getBestPosition,
  getAveragePosition,
  getWorstPosition,
  getTeamChartData,
  getQ1DQs,
  getQ2DQs
} from "./teamUtility"

// Team profile page.
const Team: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [team, setTeam] = useState<teamType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
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

  // Navigate to driver profile.
  const handleDriverClick = (driver: driverType) => {
    navigate(`/driver/${driver._id}`)
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

  // Get chart data for team position history.
  const chartData = getTeamChartData(team.drivers)
  const hasPositionData = chartData.length > 0 && chartData.some(line => line.data.length > 0)

  // Determine text color based on background luminance.
  const textColor = team.dominantColour
    ? getContrastTextColor(team.dominantColour)
    : 'white'

  // Check if user has permission to edit this team.
  const canEdit = user.permissions.admin
    || user.permissions.adjudicator
    || createdByID(team.created_by) === user._id

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
        <IconList items={team.drivers} onItemClick={handleDriverClick} centered iconBackground="#FFFFFF"/>
        <div className="team-stats">
          <p>P10 Finishes: <span>{getP10Finishes(team.drivers)}</span></p>
          <p>Best Streak: <span>{getBestStreak(team.drivers)}</span></p>
          <p>Runner-Up: <span>{getRunnerUps(team.drivers)}</span></p>
          <p>Best: <span>{getBestPosition(team.drivers) ? `P${getBestPosition(team.drivers)}` : '-'}</span></p>
          <p>Average: <span>{getAveragePosition(team.drivers) ? `P${getAveragePosition(team.drivers)}` : '-'}</span></p>
          <p>Worst: <span>{getWorstPosition(team.drivers) ? `P${getWorstPosition(team.drivers)}` : '-'}</span></p>
          {team.series?.some(s => s.shortName === "F1") && (
            <>
              <p>Q2 DQ's: <span>{getQ2DQs(team.drivers)}</span></p>
              <p>Q1 DQ's: <span>{getQ1DQs(team.drivers)}</span></p>
            </>
          )}
        </div>
      </div>
      {hasPositionData && (
        <div className="team-chart-container">
          <ResponsiveLine
            data={chartData}
            margin={{ top: 30, right: 0, bottom: 10, left: 0 }}
            curve="basis"
            colors={[textColor]}
            lineWidth={3}
            enablePoints={false}
            enableGridX={false}
            enableGridY={false}
            axisTop={null}
            axisRight={null}
            axisBottom={null}
            axisLeft={null}
            isInteractive={false}
            legends={[]}
            animate={false}
          />
        </div>
      )}
      {canEdit &&
        <EditButton
          onClick={handleEdit}
          size="medium"
          absolute
        />
      }
    </div>
  )
}

export default Team
