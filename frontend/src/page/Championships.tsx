import React, { useContext, useEffect, useState } from "react"
import { ChampType } from "../shared/types"
import { getCompetitors } from "../shared/utility"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getChamps } from "../shared/requests/champRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import ChampCard from "../components/cards/champCard/ChampCard"

const Championships: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ champs, setChamps ] = useState<ChampType[]>([])
  const [ sortedChamps, setSortedChamps ] = useState<ChampType[]>([]) // Immutable sorted source of truth.
  const [ search, setSearch ] = useState<ChampType[]>([]) // Filtered display list.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()

  // Fetch all championships on mount.
  useEffect(() => {
    getChamps(setChamps, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sort championships: adjudicator first, then competitor, then others.
  // Within each category, sort by most recently updated.
  useEffect(() => {
    const sorted = [...champs].sort((a, b) => {
      const isAdjudicatorA = a.adjudicator?.current?._id === user._id
      const isAdjudicatorB = b.adjudicator?.current?._id === user._id
      const isCompetitorA = getCompetitors(a).some(c => c.competitor._id === user._id)
      const isCompetitorB = getCompetitors(b).some(c => c.competitor._id === user._id)

      // Assign priority: adjudicator = 0, competitor = 1, other = 2
      const priorityA = isAdjudicatorA ? 0 : isCompetitorA ? 1 : 2
      const priorityB = isAdjudicatorB ? 0 : isCompetitorB ? 1 : 2

      // Primary sort by priority.
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // Secondary sort by updated_at (most recent first).
      const dateA = new Date(a.updated_at).getTime()
      const dateB = new Date(b.updated_at).getTime()
      return dateB - dateA
    })
    setSortedChamps(sorted)
    setSearch(sorted)
  }, [champs, user._id])

  const renderChampsList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/> 
    }

    return (
      search.map((c, i) => (
        <ChampCard
          key={i}
          champ={c}
          onClick={() => navigate(`/championship/${c._id}`)}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={sortedChamps}
        setSearch={setSearch}
        preserveOrder
        label="Search Championships"
      />
      <div className="champs-list">
        {renderChampsList()}
      </div>
      <AddButton
        onClick={() => navigate("/create-championship")}
        absolute
      />
    </div>
  )
}

export default Championships
