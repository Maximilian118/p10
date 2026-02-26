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
import ButtonBar, { ButtonConfig } from "../../components/utility/buttonBar/ButtonBar"
import EditButton from "../../components/utility/button/editButton/EditButton"
import Confirm from "../../components/utility/confirm/Confirm"
import ChampPickerModal, { PickerChamp } from "../../components/modal/configs/ChampPickerModal/ChampPickerModal"
import LeagueBanner from "./components/LeagueBanner/LeagueBanner"
import LeagueStandings from "./components/LeagueStandings/LeagueStandings"
import LeagueRoundDetail from "./components/LeagueRoundDetail/LeagueRoundDetail"
import LeagueInvite from "./components/LeagueInvite/LeagueInvite"
import LeagueResultsView from "./components/LeagueResultsView/LeagueResultsView"
import { Lock, GroupAdd, ExitToApp } from "@mui/icons-material"

// Views for the league detail page.
type LeagueView = "detail" | "invite"

// League detail page — hero banner, head-to-head comparison, round history, ButtonBar with join/leave.
const League: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [league, setLeague] = useState<LeagueType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [view, setView] = useState<LeagueView>("detail")

  // User's championships for join flow.
  const [userChamps, setUserChamps] = useState<ChampType[]>([])
  const [champsLoading, setChampsLoading] = useState<boolean>(false)

  // Join flow state.
  const [joinLoading, setJoinLoading] = useState<boolean>(false)
  const [showChampPicker, setShowChampPicker] = useState<boolean>(false)

  // Leave flow state.
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false)
  const [leaveLoading, setLeaveLoading] = useState<boolean>(false)

  // Season-end results view state.
  const [showResultsView, setShowResultsView] = useState<boolean>(false)

  // Fetch league on mount.
  useEffect(() => {
    if (id) {
      getLeagueById(id, setLeague, user, setUser, navigate, setLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Detect season-end results view on page load — show if within 24h window.
  useEffect(() => {
    if (league?.seasonEndedAt && league.seasonEndStandings) {
      const elapsedMs = Date.now() - new Date(league.seasonEndedAt).getTime()
      const twentyFourHoursMs = 24 * 60 * 60 * 1000
      if (elapsedMs < twentyFourHoursMs) {
        setShowResultsView(true)
        return
      }
    }
    setShowResultsView(false)
  }, [league?.seasonEndedAt, league?.seasonEndStandings])

  // Fetch user's championships for join flow.
  useEffect(() => {
    if (league) {
      getChamps(setUserChamps, user, setUser, navigate, setChampsLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league?._id])

  // Build enriched list of same-series champs the user adjudicates, with eligibility info.
  const pickerChamps: PickerChamp[] = userChamps
    .filter((c) => c.series?._id === league?.series?._id && c.adjudicator?.current?._id === user._id)
    .map((c) => {
      if (c.league) return { champ: c, eligible: false, reason: "Already in a league" }
      if ((c.competitors?.length || 0) < 7) return { champ: c, eligible: false, reason: "Needs 7+ competitors" }
      return { champ: c, eligible: true }
    })

  // Eligible championships only — used for button logic and auto-join.
  const eligibleChamps = pickerChamps.filter((pc) => pc.eligible).map((pc) => pc.champ)

  // Find if user has a championship enrolled in this league.
  const userMember = league?.championships.find((m) => {
    if (!m.active || !m.championship) return false
    return m.adjudicator?._id === user._id
  })

  // Whether the current user can edit (creator or admin).
  const canEdit = league?.creator?._id === user._id || user.permissions?.admin

  // Count of active championships in the league.
  const activeCount = league?.championships.filter((c) => c.active).length || 0
  const isFull = activeCount >= (league?.settings.maxChampionships || 12)

  // Navigate to CreateLeague in edit mode.
  const handleEdit = () => {
    navigate("/create-league", { state: { league } })
  }

  // Handle joining the league — auto-join if one eligible champ and no ineligible ones to show, otherwise show picker.
  const handleJoinClick = () => {
    if (eligibleChamps.length === 1 && pickerChamps.length === 1) {
      handleJoin(eligibleChamps[0])
    } else {
      setShowChampPicker(true)
    }
  }

  // Execute join with a specific championship.
  const handleJoin = async (champ: ChampType) => {
    if (!league) return
    setJoinLoading(true)
    const updated = await joinLeague(league._id, champ._id, user, setUser, navigate, setBackendErr)
    if (updated) {
      setLeague(updated)
      setShowChampPicker(false)
    }
    setJoinLoading(false)
  }

  // Execute leave for the user's enrolled championship.
  const handleLeave = async () => {
    if (!userMember?.championship || !league) return
    setLeaveLoading(true)
    const updated = await leaveLeague(league._id, userMember.championship._id, user, setUser, navigate, setBackendErr)
    if (updated) {
      setLeague(updated)
      setShowLeaveConfirm(false)
    }
    setLeaveLoading(false)
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

  // Build the left-side button (mutually exclusive, priority order).
  const buildLeftButton = (): ButtonConfig | null => {
    // Locked — no one can join or leave.
    if (league.locked) {
      return { label: "Locked", startIcon: <Lock />, disabled: true, color: "inherit" }
    }
    // League is full.
    if (isFull && !userMember) {
      return { label: "League Full", disabled: true, color: "inherit" }
    }
    // Invite only — user has no invite for any eligible champ and no champ in league.
    if (league.settings.inviteOnly && !userMember) {
      const hasInvite = eligibleChamps.some((c) =>
        league.invited?.some((inv) => inv.championship?._id === c._id),
      )
      if (!hasInvite) {
        return { label: "Invite Only", startIcon: <Lock />, disabled: true, color: "inherit" }
      }
    }
    // Invite Championships button — creator/admin on invite-only league.
    if (canEdit && league.settings.inviteOnly && view === "detail") {
      return { label: "Invite Championships", startIcon: <GroupAdd />, onClick: () => setView("invite"), color: "primary" }
    }
    // Leave League — user has a champ in this league.
    if (userMember) {
      return { label: "Leave League", startIcon: <ExitToApp />, onClick: () => setShowLeaveConfirm(true), color: "error" }
    }
    // Join League — user adjudicates at least one same-series champ (modal shows eligibility per champ).
    if (!champsLoading && pickerChamps.length > 0) {
      return { label: "Join League", startIcon: <GroupAdd />, onClick: handleJoinClick, color: "success", loading: joinLoading }
    }
    return null
  }

  const leftButton = buildLeftButton()
  const leftButtons: ButtonConfig[] = leftButton ? [leftButton] : []

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

  // Season-end results view — replaces entire page content for 24h.
  if (showResultsView && league.seasonEndedAt && league.seasonEndStandings) {
    return (
      <div className="content-container league-detail">
        <LeagueResultsView
          seasonEndStandings={league.seasonEndStandings}
          season={league.season - 1}
          seasonEndedAt={league.seasonEndedAt}
          onSkip={() => setShowResultsView(false)}
        />
      </div>
    )
  }

  return (
    <>
      <div className="content-container league-detail">
        {/* Hero banner — hidden during leave confirmation. */}
        {!showLeaveConfirm && <LeagueBanner league={league} />}

        {/* Leave league confirmation — replaces hero banner. */}
        {showLeaveConfirm && (
          <Confirm
            variant="danger"
            icon={<ExitToApp />}
            heading="Leave League?"
            paragraphs={[
              "Your scores will be preserved if you rejoin later.",
              "You can rejoin anytime as long as the league is open and has space.",
            ]}
            cancelText="Cancel"
            confirmText="Leave"
            onCancel={() => setShowLeaveConfirm(false)}
            onConfirm={handleLeave}
            loading={leaveLoading}
          />
        )}

        {/* Invite Championships view. */}
        {view === "invite" && (
          <LeagueInvite
            league={league}
            setLeague={setLeague}
            onBack={() => setView("detail")}
          />
        )}

        {/* Main detail view (standings + round history). */}
        {view === "detail" && !showLeaveConfirm && (
          <>
            {/* Head-to-head championship comparison. */}
            <LeagueStandings
              championships={league.championships}
              onChampClick={(champId) => navigate(`/championship/${champId}`)}
            />

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
          </>
        )}

        {backendErr.message && <ErrorDisplay backendErr={backendErr} />}
      </div>

      {/* ButtonBar — hidden during leave confirmation. */}
      {!showLeaveConfirm && (
        <ButtonBar
          leftButtons={view === "invite" ? [{ label: "Back", onClick: () => setView("detail"), color: "inherit" }] : leftButtons}
          rightChildren={canEdit && <EditButton onClick={handleEdit} size="medium" />}
        />
      )}

      {/* ChampPicker modal for joining — shows eligible and ineligible champs with status chips. */}
      {showChampPicker && (
        <ChampPickerModal
          championships={pickerChamps}
          onSelect={handleJoin}
          onClose={() => setShowChampPicker(false)}
          loading={joinLoading}
        />
      )}
    </>
  )
}

export default League
