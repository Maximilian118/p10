import React, { useContext, useEffect, useMemo, useState } from "react"
import { LeagueType } from "../shared/types"
import Search from "../components/utility/search/Search"
import ButtonBar from "../components/utility/buttonBar/ButtonBar"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getLeagues } from "../shared/requests/leagueRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import LeagueCard from "../components/cards/leagueCard/LeagueCard"
import InfoModal from "../components/modal/configs/InfoModal/InfoModal"
import { tooltips } from "../shared/tooltip"
import { Info, Add } from "@mui/icons-material"
import { userType } from "../shared/types"

// Scores each league based on relevance to the current user and sorts descending.
const sortLeaguesByRelevance = (leagues: LeagueType[], user: userType): LeagueType[] => {
  const userChampIds = new Set(user.championships.map(c => c._id))
  const followingIds = new Set(user.following || [])

  // First pass: derive which series the user competes in by finding leagues that contain the user's championships.
  const userSeriesIds = new Set<string>()
  for (const league of leagues) {
    for (const member of league.championships) {
      if (member.active && member.championship && userChampIds.has(member.championship._id)) {
        if (league.series?._id) userSeriesIds.add(league.series._id)
      }
    }
  }

  // Second pass: score each league.
  const scored = leagues.map(league => {
    let score = 0

    for (const member of league.championships) {
      if (!member.active || !member.championship) continue

      // User's championship is enrolled in this league.
      if (userChampIds.has(member.championship._id)) score += 100

      // User is a competitor in one of the league's championships.
      const competitors = member.championship.competitors || []
      if (competitors.some(c => c._id === user._id)) score += 100

      // Followed users are competitors in this league.
      for (const comp of competitors) {
        if (followingIds.has(comp._id)) score += 10
      }
    }

    // League's series matches one the user competes in.
    if (league.series?._id && userSeriesIds.has(league.series._id)) score += 50

    // Open leagues are more actionable.
    if (!league.locked) score += 5

    // More active members is a slight signal.
    score += league.championships.filter(m => m.active).length

    return { league, score }
  })

  // Sort by score descending, then alphabetically by name.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.league.name.localeCompare(b.league.name)
  })

  return scored.map(s => s.league)
}

const Leagues: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check for newly created league to highlight.
  const newLeagueId = (location.state as { newLeagueId?: string })?.newLeagueId

  const [leagues, setLeagues] = useState<LeagueType[]>([])
  const [search, setSearch] = useState<LeagueType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch all leagues on mount.
  useEffect(() => {
    getLeagues(setLeagues, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sort leagues by relevance to the current user.
  const sortedLeagues = useMemo(() => sortLeaguesByRelevance(leagues, user), [leagues, user])

  // Set search results when sorted leagues change.
  useEffect(() => {
    setSearch(sortedLeagues)
  }, [sortedLeagues])

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
        original={sortedLeagues}
        setSearch={setSearch}
        label="Search Leagues"
        searchKeys={["name", "series.name"]}
        preserveOrder
      />
      <div className="champs-list">
        {renderLeaguesList()}
      </div>
      <ButtonBar
        rightButtons={[
          { onClick: () => setShowInfo(true), startIcon: <Info />, className: "info-button" },
          { onClick: () => navigate("/create-league"), startIcon: <Add />, className: "add-button" },
        ]}
      />
      {showInfo && (
        <InfoModal
          title={tooltips.league.title}
          description={[...tooltips.league.description]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}

export default Leagues
