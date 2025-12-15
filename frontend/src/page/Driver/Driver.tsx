import React, { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { ResponsiveLine } from "@nivo/line"
import './_driver.scss'
import AppContext from "../../context"
import { driverType, teamType, ChampType } from "../../shared/types"
import { getDriverChartData } from "./driverUtility"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getDrivers } from "../../shared/requests/driverRequests"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import EditButton from "../../components/utility/button/editButton/EditButton"
import ImageIcon from "../../components/utility/icon/imageIcon/ImageIcon"
import CounterIcon from "../../components/utility/icon/counterIcon/CounterIcon"

// Driver profile page displaying driver stats and body image.
const Driver: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if driver was passed via navigation state.
  const locationDriver = (location.state as { driver?: driverType })?.driver

  const [ driver, setDriver ] = useState<driverType | null>(locationDriver || null)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ lastTeamIcon, setLastTeamIcon ] = useState<number>(10)
  const driverTeamsRef = useRef<HTMLDivElement>(null)

  // Fetch driver if not passed via location state.
  useEffect(() => {
    if (!locationDriver && id) {
      const fetchDriver = async () => {
        // Temporary state to capture fetched drivers.
        let fetchedDrivers: driverType[] = []
        const tempSetDrivers = (drivers: driverType[] | ((prev: driverType[]) => driverType[])) => {
          if (typeof drivers === "function") {
            fetchedDrivers = drivers(fetchedDrivers)
          } else {
            fetchedDrivers = drivers
          }
        }

        await getDrivers(
          tempSetDrivers,
          user,
          setUser,
          navigate,
          setLoading,
          setBackendErr
        )

        const found = fetchedDrivers.find(d => d._id === id)
        if (found) {
          setDriver(found)
        } else {
          setBackendErr({ ...initGraphQLError, type: "driver", message: "Driver not found" })
        }
      }
      fetchDriver()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locationDriver])

  // Calculate how many team icons can fit in the container.
  useEffect(() => {
    const teamsWidth = driverTeamsRef.current?.getBoundingClientRect().width
    if (teamsWidth) {
      setLastTeamIcon(Math.floor(teamsWidth / 37) - 1)
    }
  }, [driver])

  // Navigate to edit form with driver data.
  const handleEdit = () => {
    navigate("/create-driver", { state: { driver } })
  }

  // Navigate to team profile/edit.
  const handleTeamClick = (team: teamType) => {
    navigate("/create-team", { state: { team } })
  }

  // Get unique championships from all series the driver is in.
  const getChampionships = (): ChampType[] => {
    if (!driver) return []
    return driver.series
      .flatMap(s => s.championships || [])
      .filter((c, i, arr) => arr.findIndex(x => x._id === c._id) === i)
  }

  // Get chart data for driver position history.
  const chartData = getDriverChartData(driver)
  const hasPositionData = chartData.length > 0 && chartData.some(line => line.data.length > 0)

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container driver-profile">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container driver-profile">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  // Render if driver not found.
  if (!driver) {
    return (
      <div className="content-container driver-profile">
        <p>Driver not found</p>
      </div>
    )
  }

  return (
    <div className="content-container driver-profile">
      {driver.body && <img src={driver.body} alt={`${driver.name} body`} className="driver-body-image"/>}
      <div className="driver-content">
        <div className="driver-header">
          <h2>{driver.name}</h2>
        </div>
        <div className="driver-stats">
          <div ref={driverTeamsRef} className="driver-teams">
            {driver.teams.map((team: teamType, i: number) => {
              if (i < lastTeamIcon) {
                return (
                  <ImageIcon
                    key={i}
                    src={team.icon}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTeamClick(team)
                    }}
                  />
                )
              } else if (i === lastTeamIcon) {
                return (
                  <CounterIcon
                    key={i}
                    counter={driver.teams.length - lastTeamIcon}
                  />
                )
              } else {
                return null
              }
            })}
          </div>
          <p>P10 Finishes: <span>18</span></p>
          <p>Best Streak: <span>2</span></p>
          <p>Runner-Up: <span>35</span></p>
          <p>Best: <span>P10</span></p>
          <p>Average: <span>P12</span></p>
          <p>Worst: <span>P18</span></p>
          {driver.series.some(s => s.name === "FIA Formula One World Championship") && (
            <>
              <p>Q2 DQ's: <span>2</span></p>
              <p>Q1 DQ's: <span>2</span></p>
            </>
          )}
          <div className="driver-championships">
            {getChampionships().map((champ) => (
              <ImageIcon
                key={champ._id}
                src={champ.icon}
                onClick={() => navigate(`/championship/${champ._id}`)}
              />
            ))}
          </div>
        </div>
      </div>
      {hasPositionData && (
        <div className="driver-chart-container">
          <ResponsiveLine
            data={chartData}
            margin={{ top: 30, right: 0, bottom: 10, left: 0 }}
            curve="basis"
            colors={['#E10600']}
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
      <EditButton
        onClick={handleEdit}
        size="medium"
        absolute
      />
    </div>
  )
}

export default Driver