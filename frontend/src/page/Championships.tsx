import React, { useContext, useEffect, useState } from "react"
import { ChampType } from "../shared/types"
import Search from "../components/utility/search/Search"
import ButtonBar from "../components/utility/buttonBar/ButtonBar"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getChamps } from "../shared/requests/champRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import ChampCard from "../components/cards/champCard/ChampCard"
import InfoModal from "../components/modal/configs/InfoModal/InfoModal"
import { tooltips } from "../shared/tooltip"
import { Info, Add } from "@mui/icons-material"

const Championships: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ champs, setChamps ] = useState<ChampType[]>([])
  const [ sortedChamps, setSortedChamps ] = useState<ChampType[]>([]) // Immutable sorted source of truth.
  const [ search, setSearch ] = useState<ChampType[]>([]) // Filtered display list.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ showInfo, setShowInfo ] = useState<boolean>(false)
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
      const isCompetitorA = a.competitors.some(c => c._id === user._id)
      const isCompetitorB = b.competitors.some(c => c._id === user._id)

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
          isInvited={c.invited?.some(inv => inv._id === user._id)}
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
      <ButtonBar
        rightButtons={[
          { onClick: () => setShowInfo(true), startIcon: <Info />, className: "info-button" },
          { onClick: () => navigate("/create-championship"), startIcon: <Add />, className: "add-button" },
        ]}
      />
      {showInfo && (
        <InfoModal
          title={tooltips.championship.title}
          description={[...tooltips.championship.description]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}

export default Championships
