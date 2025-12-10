import React, { useContext, useEffect, useState } from "react"
import { driverGroupType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getDriverGroups } from "../shared/requests/driverGroupRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import DriverGroupListCard from "../components/cards/driverGroupListCard/DriverGroupListCard"

const DriverGroups: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ groups, setGroups ] = useState<driverGroupType[]>([])
  const [ search, setSearch ] = useState<driverGroupType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()
  const location = useLocation()
  const newGroupId = (location.state as { newGroupId?: string })?.newGroupId

  // Fetch all driver groups on mount.
  useEffect(() => {
    getDriverGroups(setGroups, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set search results when groups are fetched.
  useEffect(() => {
    setSearch(groups)
  }, [groups])

  const renderGroupsList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/>
    }

    return (
      search.map((group, i) => (
        <DriverGroupListCard
          key={i}
          group={group}
          onClick={() => navigate(`/driver-group/${group._id}`)}
          highlight={group._id === newGroupId}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={groups}
        setSearch={setSearch}
        label="Search Driver Groups"
      />
      <div className="champs-list">
        {renderGroupsList()}
      </div>
      <AddButton
        onClick={() => navigate("/create-driver-group")}
        absolute
      />
    </div>
  )
}

export default DriverGroups
