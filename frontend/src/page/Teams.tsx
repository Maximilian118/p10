import React, { useContext, useEffect, useState } from "react"
import { teamType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getTeams } from "../shared/requests/teamRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import TeamListCard from "../components/cards/teamListCard/TeamListCard"

const Teams: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ teams, setTeams ] = useState<teamType[]>([])
  const [ search, setSearch ] = useState<teamType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()

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
          onClick={() => navigate(`/team/${team._id}`)}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={teams}
        setSearch={setSearch}
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
