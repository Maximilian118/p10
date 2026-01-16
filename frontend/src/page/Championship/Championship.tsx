import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { ChampType, formErrType, formType, RoundStatus, seriesType, badgeType } from "../../shared/types"
import { getCompetitorsFromRound, getAllDriversForRound, getAllTeamsForRound } from "../../shared/utility"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import ChampBanner from "./components/ChampBanner/ChampBanner"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ChampToolbar, { FormToolbarProps, BadgeToolbarProps } from "./components/ChampToolbar/ChampToolbar"
import CompetitorListCard from "../../components/cards/competitorListCard/CompetitorListCard"
import DriverListCard from "../../components/cards/driverListCard/DriverListCard"
import TeamListCard from "../../components/cards/teamListCard/TeamListCard"
import RoundsBar, { StandingsView } from "./components/RoundsBar/RoundsBar"
import ViewsDrawer from "./components/ViewsDrawer/ViewsDrawer"
import ChampSettings, { ChampView, ChampSettingsFormType, ChampSettingsFormErrType } from "./Views/ChampSettings/ChampSettings"
import DeleteChamp from "./Views/DeleteChamp/DeleteChamp"
import Automation, { AutomationFormType, AutomationFormErrType } from "./Views/Automation/Automation"
import Protests from "./Views/Protests/Protests"
import RuleChanges from "./Views/RuleChanges/RuleChanges"
import Badges from "./Views/Badges/Badges"
import Admin, { AdminFormType, AdminFormErrType } from "./Views/Admin/Admin"
import SeriesPicker from "../../components/utility/seriesPicker/SeriesPicker"
import { ProtestsFormType, ProtestsFormErrType, RuleChangesFormType, RuleChangesFormErrType } from "../../shared/formValidation"
import { getChampById, updateChampSettings, updateRoundStatus, updateAdminSettings } from "../../shared/requests/champRequests"
import { uplaodS3 } from "../../shared/requests/bucketRequests"
import { presetArrays } from "../../components/utility/pointsPicker/ppPresets"
import { useScrollShrink } from "../../shared/hooks/useScrollShrink"
import { useChampionshipSocket } from "../../shared/hooks/useChampionshipSocket"
import { RoundStatusPayload, BetPlacedPayload, BetConfirmedPayload, BetRejectedPayload } from "../../shared/socket/socketClient"
import CountDownView from "./Views/RoundStatus/CountDownView/CountDownView"
import BettingOpenView from "./Views/RoundStatus/BettingOpenView/BettingOpenView"
import BettingClosedView from "./Views/RoundStatus/BettingClosedView/BettingClosedView"
import ResultsView from "./Views/RoundStatus/ResultsView/ResultsView"
import { getAPIView } from "./Views/RoundStatus/APIViews"
import ConfirmView from "./Views/RoundStatus/ConfirmView/ConfirmView"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import {
  initSettingsForm,
  initAutomationForm,
  initProtestsForm,
  initRuleChangesForm,
  initAdminForm,
  hasSettingsChanged,
  hasAutomationChanged,
  hasProtestsChanged,
  hasRuleChangesChanged,
  hasAdminChanged,
  buildSettingsUpdates,
  buildAutomationUpdates,
  buildProtestsUpdates,
  buildRuleChangesUpdates,
  applySettingsOptimistically,
  applyAutomationOptimistically,
  applyProtestsOptimistically,
  applyRuleChangesOptimistically,
  applyAdminOptimistically,
} from "./champUtility"

const Championship: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const [ champ, setChamp ] = useState<ChampType | null>(null)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ form, setForm ] = useState<formType>({
    icon: null,
    profile_picture: null,
    champName: "",
  })
  const [ formErr, setFormErr ] = useState<formErrType>({
    dropzone: "",
  })
  const [ settingsForm, setSettingsForm ] = useState<ChampSettingsFormType>({
    champName: "",
    rounds: 1,
    maxCompetitors: 24,
    pointsStructure: presetArrays(1).map(item => ({
      position: item.result,
      points: item.value,
    })),
    icon: null,
    profile_picture: null,
    skipCountDown: false,
    skipResults: false,
    inviteOnly: false,
    active: true,
    series: null,
    competitorsCanBet: true,
  })
  const [ settingsFormErr, setSettingsFormErr ] = useState<ChampSettingsFormErrType>({
    champName: "",
    rounds: "",
    maxCompetitors: "",
    pointsStructure: "",
    dropzone: "",
  })
  const [ automationForm, setAutomationForm ] = useState<AutomationFormType>({
    enabled: false,
    autoOpen: false,
    autoOpenTime: 10,
    autoClose: false,
    autoCloseTime: 5,
    autoNextRound: false,
    autoNextRoundTime: 60,
  })
  const [ automationFormErr, setAutomationFormErr ] = useState<AutomationFormErrType>({
    autoOpenTime: "",
    autoCloseTime: "",
    autoNextRoundTime: "",
  })
  const [ protestsForm, setProtestsForm ] = useState<ProtestsFormType>({
    alwaysVote: false,
    allowMultiple: false,
    expiry: 7,
  })
  const [ protestsFormErr, setProtestsFormErr ] = useState<ProtestsFormErrType>({
    protestsExpiry: "",
  })
  const [ ruleChangesForm, setRuleChangesForm ] = useState<RuleChangesFormType>({
    alwaysVote: false,
    allowMultiple: false,
    expiry: 7,
  })
  const [ ruleChangesFormErr, setRuleChangesFormErr ] = useState<RuleChangesFormErrType>({
    ruleChangesExpiry: "",
  })
  const [ adminForm, setAdminForm ] = useState<AdminFormType>({
    adjCanSeeBadges: true,
  })
  const [ adminFormErr ] = useState<AdminFormErrType>({})
  const [ seriesList, setSeriesList ] = useState<seriesType[]>([])

  // RoundsBar state - which round to view and which standings type.
  const [ viewedRoundIndex, setViewedRoundIndex ] = useState<number | null>(null)
  const [ standingsView, setStandingsView ] = useState<StandingsView>("competitors")

  // Round status view - when a round is in an active state (not waiting/completed).
  const [ roundStatusView, setRoundStatusView ] = useState<RoundStatus | null>(null)

  // Track last rejected bet for BettingOpenView to show rejection feedback.
  const [ lastRejectedBet, setLastRejectedBet ] = useState<BetRejectedPayload | null>(null)

  // Track last bet placed (from other users) for BettingOpenView to show animation.
  const [ lastBetPlaced, setLastBetPlaced ] = useState<BetPlacedPayload | null>(null)

  // Show start round confirmation before beginning countdown.
  const [ showStartConfirm, setShowStartConfirm ] = useState<boolean>(false)

  // Ref to expose DropZone's open function for external triggering.
  const dropzoneOpenRef = useRef<(() => void) | null>(null)
  const [ justJoined, setJustJoined ] = useState<boolean>(false)

  // Scroll-based shrinking for banner.
  const { shrinkRatio, handleScroll } = useScrollShrink({ threshold: 70 })
  const [ drawerOpen, setDrawerOpen ] = useState<boolean>(false)
  const [ view, setView ] = useState<ChampView>("competitors")
  const [ viewHistory, setViewHistory ] = useState<ChampView[]>([])

  // Badge picker state - managed here so ChampToolbar can show Add/Filter buttons.
  const [ badgeIsEdit, setBadgeIsEdit ] = useState<boolean | badgeType>(false)
  const [ badgeDraw, setBadgeDraw ] = useState<boolean>(false)
  const [ badgeEditHandlers, setBadgeEditHandlers ] = useState<{
    submit: () => Promise<void>
    delete: () => Promise<void>
    loading: boolean
    isNewBadge: boolean
  } | null>(null)

  const navigate = useNavigate()

  // Handle real-time round status updates from socket.
  const handleRoundStatusChange = useCallback((payload: RoundStatusPayload) => {
    // Update local champ state with new status and round data if included.
    setChamp(prev => {
      if (!prev) return prev
      const newRounds = [...prev.rounds]
      if (payload.roundIndex >= 0 && payload.roundIndex < newRounds.length) {
        newRounds[payload.roundIndex] = {
          ...newRounds[payload.roundIndex],
          status: payload.status,
          statusChangedAt: payload.timestamp,
          // Merge round data if included in payload (when transitioning from waiting).
          ...(payload.round && {
            drivers: payload.round.drivers,
            competitors: payload.round.competitors,
            teams: payload.round.teams,
          }),
        }
      }
      return { ...prev, rounds: newRounds }
    })

    // Show the appropriate status view for active statuses.
    if (payload.status !== "waiting" && payload.status !== "completed") {
      setRoundStatusView(payload.status)
    } else {
      setRoundStatusView(null)
    }
  }, [])

  // Handle real-time bet updates from socket (from other users).
  const handleBetPlaced = useCallback((payload: BetPlacedPayload) => {
    setLastBetPlaced(payload)
    setChamp(prev => {
      if (!prev) return prev
      const newRounds = [...prev.rounds]
      if (payload.roundIndex >= 0 && payload.roundIndex < newRounds.length) {
        const round = { ...newRounds[payload.roundIndex] }
        const newCompetitors = [...round.competitors]

        // Find the competitor who placed the bet and update their bet.
        const competitorIdx = newCompetitors.findIndex(
          c => c.competitor._id === payload.competitorId
        )
        if (competitorIdx !== -1) {
          // Find the full driver object from the round's drivers array.
          const driver = payload.driverId
            ? round.drivers.find(d => d.driver._id === payload.driverId)?.driver || null
            : null

          newCompetitors[competitorIdx] = {
            ...newCompetitors[competitorIdx],
            bet: driver,
          }
        }

        round.competitors = newCompetitors
        newRounds[payload.roundIndex] = round
      }
      return { ...prev, rounds: newRounds }
    })
  }, [])

  // Handle our own bet being confirmed via socket.
  const handleBetConfirmed = useCallback((payload: BetConfirmedPayload) => {
    setChamp(prev => {
      if (!prev) return prev
      const newRounds = [...prev.rounds]
      if (payload.roundIndex >= 0 && payload.roundIndex < newRounds.length) {
        const round = { ...newRounds[payload.roundIndex] }
        const newCompetitors = [...round.competitors]

        // Find the competitor entry and update their bet.
        const competitorIdx = newCompetitors.findIndex(
          c => c.competitor._id === payload.competitorId
        )
        if (competitorIdx !== -1) {
          // Find the full driver object from the round's drivers array.
          const driver = round.drivers.find(d => d.driver._id === payload.driverId)?.driver || null

          newCompetitors[competitorIdx] = {
            ...newCompetitors[competitorIdx],
            bet: driver,
          }
        }

        round.competitors = newCompetitors
        newRounds[payload.roundIndex] = round
      }
      return { ...prev, rounds: newRounds }
    })
  }, [])

  // Handle our own bet being rejected via socket.
  const handleBetRejected = useCallback((payload: BetRejectedPayload) => {
    setLastRejectedBet(payload)
  }, [])

  // Connect to championship socket for real-time updates.
  useChampionshipSocket(id, handleRoundStatusChange, handleBetPlaced, handleBetConfirmed, handleBetRejected)

  // Navigate to a new view while tracking history.
  const navigateToView = (newView: ChampView) => {
    if (newView !== view) {
      setViewHistory(prev => [...prev, view])
      setView(newView)
    }
  }

  // Navigate back to the previous view.
  // Resets all form states when exiting settings entirely (settings → competitors).
  const navigateBack = () => {
    if (viewHistory.length > 0) {
      const previousView = viewHistory[viewHistory.length - 1]

      // Reset all form states when exiting settings section entirely.
      if (view === "settings" && previousView === "competitors" && champ) {
        setSettingsForm(initSettingsForm(champ))
        setAutomationForm(initAutomationForm(champ))
        setProtestsForm(initProtestsForm(champ))
        setRuleChangesForm(initRuleChangesForm(champ))
      }

      setViewHistory(prev => prev.slice(0, -1))
      setView(previousView)
    }
  }

  // Navigate directly to the default view and clear history.
  const navigateToDefault = () => {
    setView("competitors")
    setViewHistory([])
  }

  // Handle banner click - navigate to default and reset standings view.
  const handleBannerClick = () => {
    navigateToDefault()
    setStandingsView("competitors")
  }

  // Fetch championship data when ID changes.
  useEffect(() => {
    if (id) {
      getChampById(id, setChamp, user, setUser, navigate, setLoading, setBackendErr)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Initialize settings form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setSettingsForm(initSettingsForm(champ))
    }
  }, [champ])

  // Initialize automation form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setAutomationForm(initAutomationForm(champ))
    }
  }, [champ])

  // Initialize protests form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setProtestsForm(initProtestsForm(champ))
    }
  }, [champ])

  // Initialize rule changes form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setRuleChangesForm(initRuleChangesForm(champ))
    }
  }, [champ])

  // Initialize admin form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setAdminForm(initAdminForm(champ))
    }
  }, [champ])

  // Check current round status on load - show status view if round is active.
  // Runs when champ data is loaded (champ._id changes).
  // Resets roundStatusView when navigating to a championship without an active round.
  useEffect(() => {
    if (champ) {
      const currentRound = champ.rounds.find(r => r.status !== "completed")
      if (currentRound && currentRound.status !== "waiting" && currentRound.status !== "completed") {
        setRoundStatusView(currentRound.status)
      } else {
        setRoundStatusView(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champ?._id])

  // Check if forms have changes compared to champ data.
  const settingsChanged = champ ? hasSettingsChanged(settingsForm, champ) : false
  const automationChanged = champ ? hasAutomationChanged(automationForm, champ) : false
  const protestsChanged = champ ? hasProtestsChanged(protestsForm, champ) : false
  const ruleChangesChanged = champ ? hasRuleChangesChanged(ruleChangesForm, champ) : false
  const adminChanged = champ ? hasAdminChanged(adminForm, champ) : false

  // Handle settings form submission with optimistic updates.
  const handleSettingsSubmit = async () => {
    if (!champ) return

    // Build updates object with only changed fields.
    const updates = buildSettingsUpdates(settingsForm, champ)

    // Upload images to S3 if changed.
    if (settingsForm.icon instanceof File) {
      const iconURL = await uplaodS3(
        "championships",
        champ.name,
        "icon",
        settingsForm.icon,
        setBackendErr,
        user,
        setUser,
        navigate,
        2,
      )
      if (!iconURL) return
      updates.icon = iconURL
    }

    if (settingsForm.profile_picture instanceof File) {
      const ppURL = await uplaodS3(
        "championships",
        champ.name,
        "profile_picture",
        settingsForm.profile_picture,
        setBackendErr,
        user,
        setUser,
        navigate,
        2,
      )
      if (!ppURL) return
      updates.profile_picture = ppURL
    }

    // Exit early if no changes.
    if (Object.keys(updates).length === 0) return

    // Store previous state for rollback.
    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => prev ? applySettingsOptimistically(prev, updates, settingsForm) : prev)

    // Make the API request.
    const result = await updateChampSettings(
      champ._id,
      updates,
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
      setSettingsForm(prev => ({ ...prev, icon: null, profile_picture: null }))
    } else {
      setChamp(previousChamp)
    }
  }

  // Handle automation form submission with optimistic updates.
  const handleAutomationSubmit = async () => {
    if (!champ) return

    const automationUpdates = buildAutomationUpdates(automationForm, champ)

    // Exit early if no changes.
    if (Object.keys(automationUpdates).length === 0) return

    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => prev ? applyAutomationOptimistically(prev, automationUpdates) : prev)

    const result = await updateChampSettings(
      champ._id,
      { automation: automationUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
    } else {
      setChamp(previousChamp)
    }
  }

  // Handle protests form submission with optimistic updates.
  const handleProtestsSubmit = async () => {
    if (!champ) return

    const protestsUpdates = buildProtestsUpdates(protestsForm, champ)

    // Exit early if no changes.
    if (Object.keys(protestsUpdates).length === 0) return

    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => prev ? applyProtestsOptimistically(prev, protestsUpdates) : prev)

    const result = await updateChampSettings(
      champ._id,
      { protests: protestsUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
    } else {
      setChamp(previousChamp)
    }
  }

  // Handle rule changes form submission with optimistic updates.
  const handleRuleChangesSubmit = async () => {
    if (!champ) return

    const ruleChangesUpdates = buildRuleChangesUpdates(ruleChangesForm, champ)

    // Exit early if no changes.
    if (Object.keys(ruleChangesUpdates).length === 0) return

    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => prev ? applyRuleChangesOptimistically(prev, ruleChangesUpdates) : prev)

    const result = await updateChampSettings(
      champ._id,
      { ruleChanges: ruleChangesUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
    } else {
      setChamp(previousChamp)
    }
  }

  // Handle admin form submission with optimistic updates.
  const handleAdminSubmit = async () => {
    if (!champ) return

    const adminUpdates = { adjCanSeeBadges: adminForm.adjCanSeeBadges }

    // Exit early if no changes.
    if (!adminChanged) return

    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => prev ? applyAdminOptimistically(prev, adminUpdates) : prev)

    await updateAdminSettings(
      champ._id,
      adminUpdates,
      user,
      setUser,
      navigate,
      setChamp,
      setBackendErr,
    )

    // If the request failed, the setChamp in updateAdminSettings won't be called
    // and our optimistic update remains. The backend error will show in UI.
    // If successful, setChamp is called with the server response.
  }

  // Handle starting a round (adjudicator clicks start button).
  // Transitions the current round from "waiting" to "countDown".
  const handleStartRound = async () => {
    if (!champ || !id) return

    const currentRoundIdx = champ.rounds.findIndex(r => r.status === "waiting")
    if (currentRoundIdx === -1) return

    const result = await updateRoundStatus(
      id,
      currentRoundIdx,
      "countDown",
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
      setRoundStatusView("countDown")
    }
  }

  // Handle advancing to the next round status (for adjudicator controls).
  const handleAdvanceStatus = async (newStatus: RoundStatus) => {
    if (!champ || !id) return

    const currentRoundIdx = champ.rounds.findIndex(r => r.status !== "completed" && r.status !== "waiting")
    if (currentRoundIdx === -1) return

    const result = await updateRoundStatus(
      id,
      currentRoundIdx,
      newStatus,
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      setChamp(result)
      if (newStatus === "completed") {
        setRoundStatusView(null)
      } else {
        setRoundStatusView(newStatus)
      }
    }
  }

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  // Render if championship not found.
  if (!champ) {
    return (
      <div className="content-container">
        <p>Championship not found</p>
      </div>
    )
  }

  // Determine if current user is the adjudicator or admin.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const isAdmin = user.permissions?.admin === true
  const canAccessSettings = isAdjudicator || isAdmin

  // Determine if we're in an active round status view (hides RoundsBar/ChampToolbar).
  const isInRoundStatusView = roundStatusView !== null
    && roundStatusView !== "waiting"
    && roundStatusView !== "completed"

  // Force banner to be fully shrunk when in round status views or confirmation.
  const effectiveShrinkRatio = isInRoundStatusView || showStartConfirm ? 1 : shrinkRatio

  // Compute round viewing state - based on COMPLETED rounds only.
  // Users can only navigate between completed rounds; "waiting" rounds are not viewable.
  const completedRoundsCount = champ.rounds.filter(r => r.status === "completed").length
  const lastCompletedIndex = completedRoundsCount - 1 // -1 if none completed

  // viewedIndex can only be a completed round (or show pre-season from round 0).
  const viewedIndex = viewedRoundIndex !== null
    ? Math.min(viewedRoundIndex, Math.max(0, lastCompletedIndex))
    : Math.max(0, lastCompletedIndex)

  // When no rounds completed, show "pre-season" standings from round 0.
  const viewedRound = champ.rounds[viewedIndex]

  // Active round index and data - the round currently in progress (for status views/API calls).
  const activeRoundIndex = champ.rounds.findIndex(r => r.status !== "completed" && r.status !== "waiting")
  const activeRound = activeRoundIndex >= 0 ? champ.rounds[activeRoundIndex] : null

  // Round number for display - shows active round when in progress, otherwise completed count.
  const viewedRoundNumber = activeRoundIndex >= 0
    ? activeRoundIndex + 1  // Show active round number when a round is in progress.
    : (completedRoundsCount > 0 ? viewedIndex + 1 : 0)  // Show viewed completed round.

  // Grouped toolbar props for form views.
  const settingsToolbarProps: FormToolbarProps = {
    formErr: settingsFormErr,
    onSubmit: handleSettingsSubmit,
    changed: settingsChanged,
  }

  const automationToolbarProps: FormToolbarProps = {
    formErr: automationFormErr,
    onSubmit: handleAutomationSubmit,
    changed: automationChanged,
  }

  const protestsToolbarProps: FormToolbarProps = {
    formErr: protestsFormErr,
    onSubmit: handleProtestsSubmit,
    changed: protestsChanged,
  }

  const ruleChangesToolbarProps: FormToolbarProps = {
    formErr: ruleChangesFormErr,
    onSubmit: handleRuleChangesSubmit,
    changed: ruleChangesChanged,
  }

  const adminToolbarProps: FormToolbarProps = {
    formErr: adminFormErr,
    onSubmit: handleAdminSubmit,
    changed: adminChanged,
  }

  // Grouped toolbar props for badge view.
  const badgeToolbarProps: BadgeToolbarProps = {
    onAdd: () => setBadgeIsEdit(true),
    onFilter: () => setBadgeDraw(!badgeDraw),
    isEdit: badgeIsEdit,
    onBack: () => setBadgeIsEdit(false),
    onDelete: badgeEditHandlers?.delete,
    onSubmit: badgeEditHandlers?.submit,
    loading: badgeEditHandlers?.loading,
  }

  return (
    <>
      {/* Banner outside scroll container to avoid feedback loop when shrinking */}
      {isAdjudicator ? (
        view === "settings" ? (
          <ChampBanner<ChampSettingsFormType, ChampSettingsFormErrType>
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            form={settingsForm}
            setForm={setSettingsForm}
            formErr={settingsFormErr}
            setFormErr={setSettingsFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            onBannerClick={handleBannerClick}
            settingsMode={true}
            openRef={dropzoneOpenRef}
            shrinkRatio={effectiveShrinkRatio}
            viewedRoundNumber={viewedRoundNumber}
          />
        ) : (
          <ChampBanner<formType, formErrType>
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            form={form}
            setForm={setForm}
            formErr={formErr}
            setFormErr={setFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            onBannerClick={handleBannerClick}
            shrinkRatio={effectiveShrinkRatio}
            viewedRoundNumber={viewedRoundNumber}
          />
        )
      ) : (
        <ChampBanner champ={champ} readOnly onBannerClick={handleBannerClick} shrinkRatio={effectiveShrinkRatio} viewedRoundNumber={viewedRoundNumber} />
      )}

      {view === "competitors" && !isInRoundStatusView && !showStartConfirm && (
        <RoundsBar
          totalRounds={champ.rounds.length}
          completedRounds={completedRoundsCount}
          viewedRoundIndex={viewedIndex}
          standingsView={standingsView}
          setViewedRoundIndex={setViewedRoundIndex}
          setStandingsView={setStandingsView}
          isAdjudicator={isAdjudicator}
          onStartNextRound={() => setShowStartConfirm(true)}
        />
      )}

      <div className="content-container" onScroll={handleScroll}>
        {/* Round Status Views - shown during active round states (use activeRound, not viewedRound) */}
        {isInRoundStatusView && roundStatusView === "countDown" && activeRound && (
          <CountDownView
            round={activeRound}
            isAdjudicator={isAdjudicator}
            onSkipTimer={() => handleAdvanceStatus("betting_open")}
          />
        )}
        {isInRoundStatusView && roundStatusView === "betting_open" && activeRound && id && (
          <BettingOpenView
            round={activeRound}
            champId={id}
            roundIndex={activeRoundIndex}
            isAdjudicator={isAdjudicator}
            onAdvance={() => handleAdvanceStatus("betting_closed")}
            lastRejectedBet={lastRejectedBet}
            lastBetPlaced={lastBetPlaced}
            automation={champ.settings.automation}
            competitorsCanBet={champ.settings.competitorsCanBet}
          />
        )}
        {isInRoundStatusView && roundStatusView === "betting_closed" && activeRound && (() => {
          const APIViewComponent = champ.series.hasAPI ? getAPIView(champ.series.shortName) : null
          if (APIViewComponent) {
            return (
              <APIViewComponent
                round={activeRound}
                isAdjudicator={isAdjudicator}
                onAdvance={() => handleAdvanceStatus("results")}
              />
            )
          }
          return (
            <BettingClosedView
              round={activeRound}
              roundIndex={activeRoundIndex}
              champId={champ._id!}
              isAdjudicator={isAdjudicator}
              onAdvance={() => handleAdvanceStatus("results")}
              setChamp={setChamp}
              setBackendErr={setBackendErr}
            />
          )
        })()}
        {isInRoundStatusView && roundStatusView === "results" && activeRound && (
          <ResultsView
            round={activeRound}
            isAdjudicator={isAdjudicator}
            onSkipTimer={() => handleAdvanceStatus("completed")}
          />
        )}

        {/* Start Round Confirmation - shown before countdown begins */}
        {showStartConfirm && (
          <ConfirmView
            variant="success"
            icon={<PlayArrowIcon />}
            heading={`Start Round ${completedRoundsCount + 1}?`}
            paragraphs={[
              "This will begin the countdown.",
              "Betting will open shortly after."
            ]}
            cancelText="Go Back"
            confirmText="Confirm Start Round"
            onCancel={() => setShowStartConfirm(false)}
            onConfirm={async () => {
              await handleStartRound()
              setShowStartConfirm(false)
            }}
          />
        )}

        {/* Default competitors view - shown when not in active round status */}
        {view === "competitors" && !isInRoundStatusView && !showStartConfirm && (
          <div className="championship-list">
              {standingsView === "competitors" && viewedRound &&
                getCompetitorsFromRound(viewedRound).map((c, i) => (
                  <CompetitorListCard
                    key={c.competitor._id || i}
                    highlight={justJoined && c.competitor._id === user._id}
                    entry={c}
                  />
                ))
              }
              {standingsView === "drivers" && viewedRound &&
                getAllDriversForRound(champ.series, viewedRound).map((d, i) => (
                  <DriverListCard
                    key={d.driver._id || i}
                    driver={d.driver}
                    entry={d}
                  />
                ))
              }
              {standingsView === "teams" && viewedRound &&
                getAllTeamsForRound(champ.series, viewedRound).map((t, i) => (
                  <TeamListCard
                    key={t.team._id || i}
                    team={t.team}
                    entry={t}
                  />
                ))
              }
            </div>
        )}

        {view === "settings" && (
          <ChampSettings
            champ={champ}
            user={user}
            setView={navigateToView}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            settingsFormErr={settingsFormErr}
            setSettingsFormErr={setSettingsFormErr}
            backendErr={backendErr}
            dropzoneOpenRef={dropzoneOpenRef}
          />
        )}

        {view === "deleteChamp" && (
          <DeleteChamp
            champ={champ}
            user={user}
            setUser={setUser}
            navigate={navigate}
            setBackendErr={setBackendErr}
          />
        )}

        {view === "automation" && (
          <Automation
            champ={champ}
            user={user}
            setView={navigateToView}
            automationForm={automationForm}
            setAutomationForm={setAutomationForm}
            automationFormErr={automationFormErr}
            setAutomationFormErr={setAutomationFormErr}
            backendErr={backendErr}
          />
        )}

        {view === "protests" && (
          <Protests
            champ={champ}
            user={user}
            setView={navigateToView}
            protestsForm={protestsForm}
            setProtestsForm={setProtestsForm}
            protestsFormErr={protestsFormErr}
            setProtestsFormErr={setProtestsFormErr}
            backendErr={backendErr}
          />
        )}

        {view === "ruleChanges" && (
          <RuleChanges
            champ={champ}
            user={user}
            setView={navigateToView}
            ruleChangesForm={ruleChangesForm}
            setRuleChangesForm={setRuleChangesForm}
            ruleChangesFormErr={ruleChangesFormErr}
            setRuleChangesFormErr={setRuleChangesFormErr}
            backendErr={backendErr}
          />
        )}

        {view === "series" && (
          <SeriesPicker
            form={settingsForm}
            setForm={setSettingsForm}
            seriesList={seriesList}
            setSeriesList={setSeriesList}
            user={user}
            setUser={setUser}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
          />
        )}

        {view === "badges" && (
          <Badges
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            isAdjudicator={isAdjudicator}
            isEdit={badgeIsEdit}
            setIsEdit={setBadgeIsEdit}
            draw={badgeDraw}
            setDraw={setBadgeDraw}
            onEditHandlersReady={setBadgeEditHandlers}
          />
        )}

        {view === "admin" && isAdmin && (
          <Admin
            adminForm={adminForm}
            setAdminForm={setAdminForm}
          />
        )}

        {/* ChampToolbar - hidden during active round status views and confirmation */}
        {!isInRoundStatusView && !showStartConfirm && (
          <ChampToolbar
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            setBackendErr={setBackendErr}
            view={view}
            onBack={navigateBack}
            onJoinSuccess={() => setJustJoined(true)}
            onDrawerClick={() => setDrawerOpen(true)}
            settingsProps={settingsToolbarProps}
            automationProps={automationToolbarProps}
            protestsProps={protestsToolbarProps}
            ruleChangesProps={ruleChangesToolbarProps}
            adminProps={adminToolbarProps}
            badgeProps={badgeToolbarProps}
          />
        )}
      </div>
      <ViewsDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        view={view}
        setView={navigateToView}
        onBackToDefault={navigateToDefault}
        canAccessSettings={canAccessSettings}
        isAdmin={isAdmin}
      />
    </>
  )
}

export default Championship
