import React, { useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./_leagueInvite.scss"
import { LeagueType, ChampType } from "../../../../shared/types"
import AppContext from "../../../../context"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import { getChamps } from "../../../../shared/requests/champRequests"
import { inviteChampionshipToLeague, revokeLeagueInvite } from "../../../../shared/requests/leagueRequests"
import Search from "../../../../components/utility/search/Search"
import ChampListCard from "../../../../components/cards/champListCard/ChampListCard"
import FillLoading from "../../../../components/utility/fillLoading/FillLoading"

interface LeagueInviteProps {
  league: LeagueType
  setLeague: React.Dispatch<React.SetStateAction<LeagueType | null>>
  onBack: () => void
}

// Minimum number of competitors required for a championship to join a league.
const MIN_COMPETITORS_FOR_LEAGUE = 7

// View for inviting championships to an invite-only league.
const LeagueInvite: React.FC<LeagueInviteProps> = ({ league, setLeague, onBack }) => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [allChamps, setAllChamps] = useState<ChampType[]>([])
  const [searchResults, setSearchResults] = useState<ChampType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [invitingChampId, setInvitingChampId] = useState<string | null>(null)

  // Fetch all championships on mount.
  useEffect(() => {
    getChamps(setAllChamps, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize search results when championships are fetched.
  useEffect(() => {
    setSearchResults(allChamps)
  }, [allChamps])

  // IDs of championships already in the league (active members).
  const memberIds = new Set(
    league.championships.filter((c) => c.active).map((c) => c.championship?._id)
  )

  // IDs of championships already invited.
  const invitedIds = new Set(league.invited?.map((inv) => inv.championship?._id) || [])

  // Filter championships to only show eligible ones.
  const getEligibleChamps = (): ChampType[] => {
    return searchResults.filter((c) => {
      // Must belong to the same series.
      if (c.series?._id !== league.series?._id) return false
      // Must not already be an active member.
      if (memberIds.has(c._id)) return false
      // Must have minimum competitors.
      if ((c.competitors?.length || 0) < MIN_COMPETITORS_FOR_LEAGUE) return false
      return true
    })
  }

  // Handle inviting a championship.
  const handleInvite = async (champId: string) => {
    setInvitingChampId(champId)
    const updated = await inviteChampionshipToLeague(
      league._id, champId, user, setUser, navigate, setBackendErr
    )
    if (updated) setLeague(updated)
    setInvitingChampId(null)
  }

  // Handle revoking an invite.
  const handleRevoke = async (champId: string) => {
    setInvitingChampId(champId)
    const updated = await revokeLeagueInvite(
      league._id, champId, user, setUser, navigate, setBackendErr
    )
    if (updated) setLeague(updated)
    setInvitingChampId(null)
  }

  // Render the list of eligible championships.
  const renderChamps = () => {
    if (loading) return <FillLoading />

    const eligible = getEligibleChamps()

    if (eligible.length === 0) {
      return (
        <div className="league-invite-empty">
          <p>No championships available to invite</p>
        </div>
      )
    }

    return eligible.map((c) => {
      const isInvited = invitedIds.has(c._id)

      return (
        <ChampListCard
          key={c._id}
          name={c.name}
          icon={c.icon}
          loading={invitingChampId === c._id}
          invited={isInvited}
          onClick={() => {
            if (invitingChampId) return
            if (isInvited) {
              handleRevoke(c._id)
            } else {
              handleInvite(c._id)
            }
          }}
        />
      )
    })
  }

  return (
    <div className="league-invite-view">
      <Search
        original={allChamps}
        setSearch={setSearchResults}
        label="Search Championships"
      />
      <div className="league-invite-list">
        {renderChamps()}
      </div>
    </div>
  )
}

export default LeagueInvite
