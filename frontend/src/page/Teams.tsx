import React, { useContext, useEffect, useState } from "react"
import { teamType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getTeams } from "../shared/requests/teamRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import TeamListCard from "../components/cards/teamListCard/TeamListCard"

const Teams: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check for newly created team to highlight.
  const newTeamId = (location.state as { newTeamId?: string })?.newTeamId

  const [ teams, setTeams ] = useState<teamType[]>([])
  const [ search, setSearch ] = useState<teamType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch all teams on mount.
  useEffect(() => {
    getTeams(setTeams, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set search results when teams are fetched.
  useEffect(() => {
    setSearch(teams)
  }, [teams])

  const renderTeamsList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/>
    }

    return (
      search.map((team, i) => (
        <TeamListCard
          key={i}
          team={team}
          onClick={() => navigate(`/team/${team._id}`, { state: { team } })}
          onDriverClick={(driver) => navigate(`/driver/${driver._id}`, { state: { driver } })}
          highlight={team._id === newTeamId}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={teams}
        setSearch={setSearch}
        label="Search Teams"
      />
      <div className="champs-list">
        {renderTeamsList()}
      </div>
      <AddButton
        onClick={() => navigate("/create-team")}
        absolute
      />
    </div>
  )
}

export default Teams
