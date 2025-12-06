import React, { useContext, useEffect, useState } from "react"
import { driverType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getDrivers } from "../shared/requests/driverRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import DriverCard from "../components/cards/driverCard/DriverCard"

const Drivers: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ search, setSearch ] = useState<driverType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()

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
        <DriverCard
          key={i}
          driver={driver}
          onClick={() => navigate(`/driver/${driver._id}`)}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={drivers}
        setSearch={setSearch}
      />
      <div className="champs-list">
        {renderDriversList()}
      </div>
      <AddButton
        onClick={() => navigate("/create-driver")}
        absolute
      />
    </div>
  )
}

export default Drivers
