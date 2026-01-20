import React, { useContext, useEffect, useState } from "react"
import { driverType } from "../shared/types"
import Search from "../components/utility/search/Search"
import ButtonBar from "../components/utility/buttonBar/ButtonBar"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getDrivers } from "../shared/requests/driverRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import DriverListCard from "../components/cards/driverListCard/DriverListCard"

const Drivers: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check for newly created driver to highlight.
  const newDriverId = (location.state as { newDriverId?: string })?.newDriverId

  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ search, setSearch ] = useState<driverType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch all drivers on mount.
  useEffect(() => {
    getDrivers(setDrivers, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set search results when drivers are fetched.
  useEffect(() => {
    setSearch(drivers)
  }, [drivers])

  const renderDriversList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/>
    }

    return (
      search.map((driver, i) => (
        <DriverListCard
          key={i}
          driver={driver}
          onClick={() => navigate(`/driver/${driver._id}`, { state: { driver } })}
          onTeamClick={(team) => navigate(`/team/${team._id}`, { state: { team } })}
          highlight={driver._id === newDriverId}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={drivers}
        setSearch={setSearch}
        label="Search Drivers"
      />
      <div className="champs-list">
        {renderDriversList()}
      </div>
      <ButtonBar>
        <AddButton onClick={() => navigate("/create-driver")} />
      </ButtonBar>
    </div>
  )
}

export default Drivers
