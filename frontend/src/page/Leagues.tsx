import React, { useContext, useEffect, useState } from "react"
import { LeagueType } from "../shared/types"
import Search from "../components/utility/search/Search"
import ButtonBar from "../components/utility/buttonBar/ButtonBar"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getLeagues } from "../shared/requests/leagueRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import LeagueCard from "../components/cards/leagueCard/LeagueCard"

const Leagues: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check for newly created league to highlight.
  const newLeagueId = (location.state as { newLeagueId?: string })?.newLeagueId

  const [leagues, setLeagues] = useState<LeagueType[]>([])
  const [search, setSearch] = useState<LeagueType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch all leagues on mount.
  useEffect(() => {
    getLeagues(setLeagues, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set search results when leagues are fetched.
  useEffect(() => {
    setSearch(leagues)
  }, [leagues])

  const renderLeaguesList = () => {
    if (loading) {
      return <FillLoading />
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr} />
    }

    return search.map((league) => (
      <LeagueCard
        key={league._id}
        league={league}
        onClick={() => navigate(`/league/${league._id}`)}
        highlight={league._id === newLeagueId}
      />
    ))
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={leagues}
        setSearch={setSearch}
        label="Search Leagues"
      />
      <div className="champs-list">
        {renderLeaguesList()}
      </div>
      <ButtonBar>
        <AddButton onClick={() => navigate("/create-league")} />
      </ButtonBar>
    </div>
  )
}

export default Leagues
