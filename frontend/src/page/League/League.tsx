import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "./_league.scss"
import { LeagueType, LeagueMemberType, ChampType } from "../../shared/types"
import AppContext from "../../context"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getLeagueById, joinLeague, leaveLeague } from "../../shared/requests/leagueRequests"
import { getChamps } from "../../shared/requests/champRequests"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import EditButton from "../../components/utility/button/editButton/EditButton"
import LeagueBanner from "./components/LeagueBanner/LeagueBanner"
import LeagueStandings from "./components/LeagueStandings/LeagueStandings"
import LeagueRoundDetail from "./components/LeagueRoundDetail/LeagueRoundDetail"
import { Button, Autocomplete, TextField } from "@mui/material"

// League detail page — hero banner, head-to-head comparison, round history, join/leave controls.
const League: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [league, setLeague] = useState<LeagueType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // User's championships for join flow.
  const [userChamps, setUserChamps] = useState<ChampType[]>([])
  const [champsLoading, setChampsLoading] = useState<boolean>(false)
  const [selectedChamp, setSelectedChamp] = useState<ChampType | null>(null)

  // Fetch league on mount.
  useEffect(() => {
    if (id) {
      getLeagueById(id, setLeague, user, setUser, navigate, setLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Fetch user's championships for join flow.
  useEffect(() => {
    if (league) {
      getChamps(setUserChamps, user, setUser, navigate, setChampsLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league?._id])

  // Filter championships eligible for joining this league.
  const eligibleChamps = userChamps.filter((c) => {
    if (c.series?._id !== league?.series?._id) return false
    if (c.adjudicator?.current?._id !== user._id) return false
    if (c.league) return false
    return true
  })

  // Find if user has a championship enrolled in this league.
  const userMember = league?.championships.find((m) => {
    if (!m.active || !m.championship) return false
    return m.adjudicator?._id === user._id
  })

  // Whether the current user can edit (creator or admin).
  const canEdit = league?.creator?._id === user._id || user.permissions?.admin

  // Navigate to CreateLeague in edit mode.
  const handleEdit = () => {
    navigate("/create-league", { state: { league } })
  }

  // Handle joining the league.
  const handleJoin = async () => {
    if (!selectedChamp || !league) return
    const updated = await joinLeague(league._id, selectedChamp._id, user, setUser, navigate, setBackendErr)
    if (updated) {
      setLeague(updated)
      setSelectedChamp(null)
    }
  }

  // Handle leaving the league.
  const handleLeave = async () => {
    if (!userMember?.championship || !league) return
    const updated = await leaveLeague(league._id, userMember.championship._id, user, setUser, navigate, setBackendErr)
    if (updated) setLeague(updated)
  }

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container league-detail">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message || !league) {
    return (
      <div className="content-container league-detail">
        <ErrorDisplay backendErr={backendErr.message ? backendErr : { ...initGraphQLError, message: "League not found" }} />
      </div>
    )
  }

  // Collect all round scores across active championships for the round history view.
  const allScores: { member: LeagueMemberType; score: LeagueMemberType["scores"][0] }[] = []
  league.championships
    .filter((m) => m.active)
    .forEach((member) => {
      member.scores.forEach((score) => {
        allScores.push({ member, score })
      })
    })
  allScores.sort((a, b) => b.score.champRoundNumber - a.score.champRoundNumber)

  return (
    <div className="content-container league-detail">
      {/* Hero banner with profile_picture, icon, name, series, status chips. */}
      <LeagueBanner league={league} />

      {/* Head-to-head championship comparison. */}
      <LeagueStandings
        championships={league.championships}
        onChampClick={(champId) => navigate(`/championship/${champId}`)}
      />

      {/* Join / Leave controls. */}
      <div className="league-actions">
        {!league.locked && !userMember && eligibleChamps.length > 0 && (
          <div className="league-join">
            <Autocomplete
              options={eligibleChamps}
              loading={champsLoading}
              value={selectedChamp}
              getOptionLabel={(opt) => opt.name || ""}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={(params) => (
                <TextField {...params} label="Select Championship" variant="filled" size="small" />
              )}
              onChange={(_, val) => setSelectedChamp(val)}
              className="league-join-select"
            />
            <Button variant="contained" size="small" onClick={handleJoin} disabled={!selectedChamp}>
              Join
            </Button>
          </div>
        )}
        {!league.locked && userMember && (
          <Button variant="outlined" color="warning" size="small" onClick={handleLeave}>
            Leave League
          </Button>
        )}
      </div>

      {/* Round History. */}
      {allScores.length > 0 && (
        <div className="league-round-history">
          <h3>Round History</h3>
          {allScores.map(({ member, score }, i) => (
            <LeagueRoundDetail
              key={`${member.championship?._id}-${score.champRoundNumber}-${i}`}
              score={score}
              champName={member.championship?.name || ""}
            />
          ))}
        </div>
      )}

      {backendErr.message && <ErrorDisplay backendErr={backendErr} />}

      {/* Edit button for creator/admin. */}
      {canEdit && (
        <EditButton onClick={handleEdit} size="medium" absolute />
      )}
    </div>
  )
}

export default League
