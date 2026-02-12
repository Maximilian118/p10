import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { ChampType, formErrType, formType, RoundStatus, seriesType, badgeType, CompetitorEntryType, ProtestType } from "../../shared/types"
import { getAllDriversForRound, getAllTeamsForRound } from "../../shared/utility"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import ChampBanner from "./components/ChampBanner/ChampBanner"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import { createBackButton } from "./components/ChampToolbar/configs/baseConfigs"
import ChampToolbar, { FormToolbarProps, BadgeToolbarProps, RulesAndRegsToolbarProps, ProtestsToolbarProps } from "./components/ChampToolbar/ChampToolbar"
import CompetitorListCard from "../../components/cards/competitorListCard/CompetitorListCard"
import DriverListCard from "../../components/cards/driverListCard/DriverListCard"
import TeamListCard from "../../components/cards/teamListCard/TeamListCard"
import RoundsBar, { StandingsView } from "./components/RoundsBar/RoundsBar"
import ViewsDrawer from "./components/ViewsDrawer/ViewsDrawer"
import ChampSettings, { ChampView, ChampSettingsFormType, ChampSettingsFormErrType } from "./Views/ChampSettings/ChampSettings"
import DeleteChamp from "./Views/DeleteChamp/DeleteChamp"
import Automation, { AutomationFormType, AutomationFormErrType } from "./Views/Automation/Automation"
import ProtestSettings from "./Views/ProtestSettings/ProtestSettings"
import RuleChanges from "./Views/RuleChanges/RuleChanges"
import Badges from "./Views/Badges/Badges"
import RulesAndRegs, { RulesAndRegsEditHandlers } from "./Views/RulesAndRegs/RulesAndRegs"
import Protests from "./Views/Protests/Protests"
import Protest from "./Views/Protests/Protest/Protest"
import { editStateType, initEditState } from "../../components/utility/rulesAndRegsPicker/rulesAndRegsUtility"
import Admin, { AdminFormType, AdminFormErrType } from "./Views/Admin/Admin"
import Invite from "./Views/Invite/Invite"
import SeriesPicker from "../../components/utility/seriesPicker/SeriesPicker"
import { ProtestsFormType, ProtestsFormErrType, RuleChangesFormType, RuleChangesFormErrType } from "../../shared/formValidation"
import { getChampById, updateChampSettings, updateRoundStatus, updateAdminSettings, banCompetitor, unbanCompetitor, kickCompetitor, leaveChampionship, adjustCompetitorPoints, promoteAdjudicator, getProtestsForChampionship } from "../../shared/requests/champRequests"
import { uplaodS3 } from "../../shared/requests/bucketRequests"
import { presetArrays } from "../../components/utility/pointsPicker/ppPresets"
import { useScrollShrink } from "../../shared/hooks/useScrollShrink"
import { useChampionshipSocket } from "../../shared/hooks/useChampionshipSocket"
import { RoundStatusPayload, BetPlacedPayload, BetConfirmedPayload, BetRejectedPayload, AdjudicatorChangedPayload, SOCKET_EVENTS, getSocket } from "../../shared/socket/socketClient"
import CountDownView from "./Views/RoundStatus/CountDownView/CountDownView"
import BettingOpenView from "./Views/RoundStatus/BettingOpenView/BettingOpenView"
import BettingClosedView from "./Views/RoundStatus/BettingClosedView/BettingClosedView"
import ResultsView from "./Views/RoundStatus/ResultsView/ResultsView"
import { getSeriesConfig } from "./Views/RoundStatus/APIViews"
import type { DemoSession } from "./Views/RoundStatus/APIViews"
import { startDemo, stopDemo } from "../../api/openAPI/requests/demoRequests"
import { useSessionBanner } from "../../api/openAPI/useSessionBanner"
import Confirm from "../../components/utility/confirm/Confirm"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import BlockIcon from "@mui/icons-material/Block"
import ExitToAppIcon from "@mui/icons-material/ExitToApp"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
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
  getCompetitors,
} from "./champUtility"
import AdjudicatorBar from "./components/AdjudicatorBar/AdjudicatorBar"

const Championship: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
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

  // Loading states for form submissions.
  const [ settingsLoading, setSettingsLoading ] = useState(false)
  const [ automationLoading, setAutomationLoading ] = useState(false)
  const [ protestsLoading, setProtestsLoading ] = useState(false)
  const [ ruleChangesLoading, setRuleChangesLoading ] = useState(false)
  const [ adminLoading, setAdminLoading ] = useState(false)

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

  // Adjudicator view mode - reveals management controls on competitor cards.
  const [ adjudicatorView, setAdjudicatorView ] = useState<boolean>(false)

  // Ban confirmation dialog state.
  const [ showBanConfirm, setShowBanConfirm ] = useState<boolean>(false)
  const [ competitorToBan, setCompetitorToBan ] = useState<CompetitorEntryType | null>(null)

  // Kick confirmation dialog state.
  const [ showKickConfirm, setShowKickConfirm ] = useState<boolean>(false)
  const [ competitorToKick, setCompetitorToKick ] = useState<CompetitorEntryType | null>(null)

  // Promote confirmation dialog state.
  const [ showPromoteConfirm, setShowPromoteConfirm ] = useState<boolean>(false)
  const [ competitorToPromote, setCompetitorToPromote ] = useState<CompetitorEntryType | null>(null)

  // Invite full confirmation dialog state (adjudicator trying to invite when champ is full).
  const [ showInviteFullConfirm, setShowInviteFullConfirm ] = useState<boolean>(false)

  // Accept invite full confirmation dialog state (invited user trying to join when champ is full).
  const [ showAcceptInviteFullConfirm, setShowAcceptInviteFullConfirm ] = useState<boolean>(false)

  // Leave championship confirmation dialog state.
  const [ showLeaveConfirm, setShowLeaveConfirm ] = useState<boolean>(false)
  const [ leavingChamp, setLeavingChamp ] = useState<boolean>(false)

  // Whether a protest-level confirmation dialog is active (managed by Protest.tsx).
  const [ protestConfirmActive, setProtestConfirmActive ] = useState<boolean>(false)

  // Ref to expose DropZone's open function for external triggering.
  const dropzoneOpenRef = useRef<(() => void) | null>(null)
  const [ justJoined, setJustJoined ] = useState<boolean>(false)

  // Reset justJoined after animation completes (1.5s) to prevent replay on navigation.
  useEffect(() => {
    if (justJoined) {
      const timer = setTimeout(() => setJustJoined(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [justJoined])

  // Scroll-based shrinking for banner - uses ref for CSS updates to avoid oscillation.
  const { shrinkState, handleScroll, bannerRef, setForceShrunk } = useScrollShrink({ threshold: 70 })

  // Whether the protest-blocked confirm is shown.
  const [ showProtestBlocked, setShowProtestBlocked ] = useState(false)

  // Determine if we're in an active round status view (hides RoundsBar/ChampToolbar).
  const isInRoundStatusView = roundStatusView !== null
    && roundStatusView !== "waiting"
    && roundStatusView !== "completed"

  const [ drawerOpen, setDrawerOpen ] = useState<boolean>(false)
  const [ view, setView ] = useState<ChampView>("competitors")
  const [ viewHistory, setViewHistory ] = useState<ChampView[]>([])

  // Whether any fullscreen overlay (confirm dialog, round status view, etc.) is active.
  const isOverlayActive =
    isInRoundStatusView ||
    showStartConfirm ||
    showBanConfirm ||
    showKickConfirm ||
    showPromoteConfirm ||
    showInviteFullConfirm ||
    showAcceptInviteFullConfirm ||
    showLeaveConfirm ||
    showProtestBlocked ||
    protestConfirmActive

  // Force banner to be fully shrunk when any overlay or demo mode is active.
  // Demo mode is separate from isOverlayActive so the ChampToolbar stays visible.
  useEffect(() => {
    setForceShrunk(isOverlayActive || view === "demoMode")
  }, [isOverlayActive, view, setForceShrunk])

  // Selected protest ID for detail view.
  const [ selectedProtestId, setSelectedProtestId ] = useState<string | null>(null)

  // Protests data for the championship.
  const [ protests, setProtests ] = useState<ProtestType[]>([])

  // Selected demo session (null = show picker, set = show session view).
  const [ demoSession, setDemoSession ] = useState<DemoSession | null>(null)

  // Create protest state.
  const [ showCreateProtest, setShowCreateProtest ] = useState(false)
  const [ createProtestLoading, setCreateProtestLoading ] = useState(false)
  const createProtestSubmitRef = React.useRef<(() => Promise<void>) | null>(null)

  // Handle URL params for notification deep links.
  useEffect(() => {
    const viewParam = searchParams.get("view")
    const protestId = searchParams.get("protestId")

    if (viewParam === "protest" && protestId) {
      setSelectedProtestId(protestId)
      // Set history so back button navigates to protests list.
      setViewHistory(["protests"])
      setView("protest")
      // Clear URL params after consuming them.
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Badge picker state - managed here so ChampToolbar can show Add/Filter buttons.
  const [ badgeIsEdit, setBadgeIsEdit ] = useState<boolean | badgeType>(false)
  const [ badgeDraw, setBadgeDraw ] = useState<boolean>(false)
  const [ badgeEditHandlers, setBadgeEditHandlers ] = useState<{
    submit: () => Promise<void>
    delete: () => Promise<void>
    remove: () => Promise<void>
    loading: boolean
    deleteLoading: boolean
    removeLoading: boolean
    isNewBadge: boolean
    canSubmit: boolean
    canRemove: boolean
  } | null>(null)

  // RulesAndRegs state - managed here so ChampToolbar can show Add button.
  const [ rulesAndRegsIsEdit, setRulesAndRegsIsEdit ] = useState<editStateType>(initEditState)
  const [ rulesAndRegsEditHandlers, setRulesAndRegsEditHandlers ] = useState<RulesAndRegsEditHandlers | null>(null)

  const navigate = useNavigate()

  // Handle real-time round status updates from socket.
  const handleRoundStatusChange = useCallback((payload: RoundStatusPayload) => {
    // Update local champ state with new status and round data if included.
    // Results data (points, badges) is included in the socket payload when entering "results".
    setChamp(prev => {
      if (!prev) return prev
      const newRounds = [...prev.rounds]
      if (payload.roundIndex >= 0 && payload.roundIndex < newRounds.length) {
        newRounds[payload.roundIndex] = {
          ...newRounds[payload.roundIndex],
          status: payload.status,
          statusChangedAt: payload.timestamp,
          // Merge round data if included in payload (waiting → countDown, or any → results).
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
          c => c.competitor?._id === payload.competitorId
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
          c => c.competitor?._id === payload.competitorId
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
  // Skip joining socket room if user is banned from this championship.
  const isBannedFromChamp = champ?.banned?.some(b => b._id === user._id) ?? false
  useChampionshipSocket(id, handleRoundStatusChange, handleBetPlaced, handleBetConfirmed, handleBetRejected, isBannedFromChamp)

  // Listen for adjudicator changed events via socket.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (payload: AdjudicatorChangedPayload): void => {
      if (payload.champId !== id) return

      // Update champ state with new adjudicator.
      // The full champ data is refetched via GraphQL mutation response,
      // but socket gives immediate feedback to all users in the room.
      setChamp((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          adjudicator: {
            ...prev.adjudicator,
            current: { ...prev.adjudicator.current, _id: payload.newAdjudicatorId },
          },
        }
      })

      // Handle OLD adjudicator - exit adjudicator view and update permissions if removed.
      if (payload.oldAdjudicatorId === user._id) {
        setAdjudicatorView(false)
        // Only update permissions if backend confirmed they have no other championships.
        if (payload.oldAdjudicatorPermissionRemoved) {
          setUser((prev) => ({
            ...prev,
            permissions: { ...prev.permissions, adjudicator: false },
          }))
        }
      }

      // Handle NEW adjudicator - grant access.
      if (payload.newAdjudicatorId === user._id) {
        setUser((prev) => ({
          ...prev,
          permissions: { ...prev.permissions, adjudicator: true },
        }))
      }
    }

    socket.on(SOCKET_EVENTS.ADJUDICATOR_CHANGED, handler)

    return () => {
      socket.off(SOCKET_EVENTS.ADJUDICATOR_CHANGED, handler)
    }
  }, [id, user._id, setUser])

  // Navigate to a new view while tracking history.
  const navigateToView = (newView: ChampView) => {
    if (newView !== view) {
      setViewHistory(prev => [...prev, view])
      setView(newView)
    }
  }

  // Navigate back to the previous view.
  // Resets all form states when exiting settings entirely (settings → competitors).
  // Stops demo replay when leaving demo mode.
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

      // Handle demo mode back navigation.
      if (view === "demoMode") {
        if (demoSession) {
          // Back from session view → return to session picker.
          stopDemo(user, setUser, setBackendErr)
          setDemoSession(null)
          return
        }
        // Back from picker → normal navigation to previous view.
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

  // Handle clicking on a protest to view its details.
  const handleProtestClick = (protestId: string) => {
    setSelectedProtestId(protestId)
    navigateToView("protest")
  }

  // Handle banner click - navigate to default and reset standings view.
  const handleBannerClick = () => {
    navigateToDefault()
    setStandingsView("competitors")
  }

  // Handle leaving the championship.
  const handleLeaveChampionship = async () => {
    if (!champ) return
    setLeavingChamp(true)
    const success = await leaveChampionship(champ._id, setChamp, user, setUser, navigate, setBackendErr)
    setLeavingChamp(false)
    if (success) {
      setShowLeaveConfirm(false)
    }
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

  // Start demo replay when a session is selected.
  useEffect(() => {
    if (view === "demoMode" && demoSession) {
      startDemo(user, setUser, setBackendErr, demoSession.key)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSession])

  // Fetch protests when navigating to protests view.
  useEffect(() => {
    if (view === "protests" && champ) {
      getProtestsForChampionship(champ._id, user, setUser, navigate, setBackendErr)
        .then((fetchedProtests) => {
          if (fetchedProtests) setProtests(fetchedProtests)
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, champ?._id])

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
    if (!champ || settingsLoading) return
    setSettingsLoading(true)
    try {
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
    } finally {
      setSettingsLoading(false)
    }
  }

  // Handle automation form submission with optimistic updates.
  const handleAutomationSubmit = async () => {
    if (!champ || automationLoading) return
    setAutomationLoading(true)
    try {
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
    } finally {
      setAutomationLoading(false)
    }
  }

  // Handle protests form submission with optimistic updates.
  const handleProtestsSubmit = async () => {
    if (!champ || protestsLoading) return
    setProtestsLoading(true)
    try {
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
    } finally {
      setProtestsLoading(false)
    }
  }

  // Handle rule changes form submission with optimistic updates.
  const handleRuleChangesSubmit = async () => {
    if (!champ || ruleChangesLoading) return
    setRuleChangesLoading(true)
    try {
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
    } finally {
      setRuleChangesLoading(false)
    }
  }

  // Handle admin form submission with optimistic updates.
  const handleAdminSubmit = async () => {
    if (!champ || adminLoading) return
    setAdminLoading(true)
    try {
      const adminUpdates = { adjCanSeeBadges: adminForm.adjCanSeeBadges }

      // Exit early if no changes.
      if (!adminChanged) return

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
    } finally {
      setAdminLoading(false)
    }
  }

  // Handle starting a round (adjudicator clicks start button).
  // Transitions the current round from "waiting" to "countDown" (or betting_open if skipCountDown).
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
      // Use actual status from response (respects skipCountDown setting).
      const actualStatus = result.rounds[currentRoundIdx].status
      if (actualStatus !== "waiting" && actualStatus !== "completed") {
        setRoundStatusView(actualStatus)
      }
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
      // Use actual status from response (respects skipResults setting).
      const actualStatus = result.rounds[currentRoundIdx].status
      if (actualStatus === "completed") {
        setRoundStatusView(null)
      } else if (actualStatus !== "waiting") {
        setRoundStatusView(actualStatus)
      }
    }
  }

  // Compute round viewing state (before early returns for hooks consistency).
  const completedRoundsCount = champ?.rounds?.filter(r => r.status === "completed").length ?? 0
  const lastCompletedIndex = completedRoundsCount - 1
  const viewedIndex = viewedRoundIndex !== null
    ? Math.min(viewedRoundIndex, Math.max(0, lastCompletedIndex))
    : Math.max(0, lastCompletedIndex)
  const viewedRound = champ?.rounds?.[viewedIndex]

  // Single source of truth for all competitors to render in both normal and adjudicator view.
  const competitors = useMemo(
    () => getCompetitors(viewedRound, champ?.competitors || [], champ?.banned || [], champ?.kicked || []),
    [viewedRound, champ?.competitors, champ?.banned, champ?.kicked]
  )

  // Series-specific configuration (View component, DemoPicker, etc.).
  const seriesConfig = useMemo(
    () => champ?.series?.hasAPI ? getSeriesConfig(champ.series.shortName) : null,
    [champ?.series]
  )

  // Detect whether the current view is an active API session (live or demo).
  const isAPISessionView = useMemo(() => {
    if (!champ) return false
    const isLive = roundStatusView === "betting_closed" && !!seriesConfig
    const isDemo = view === "demoMode" && !!demoSession
    return isLive || isDemo
  }, [champ, roundStatusView, seriesConfig, view, demoSession])

  const isDemoMode = view === "demoMode" && !!demoSession

  // Session banner data (flag state, countdown, ended state) for ChampBanner.
  const sessionBanner = useSessionBanner(isAPISessionView, isDemoMode)

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container">
        <FillLoading />
      </div>
    )
  }

  // Render error state with back button to dismiss.
  if (backendErr.message) {
    return (
      <div className="content-container">
        <ErrorDisplay backendErr={backendErr} />
        <ButtonBar leftButtons={[createBackButton(() => setBackendErr(initGraphQLError))]}/>
      </div>
    )
  }

  // Render if championship not found.
  if (!champ) {
    return (
      <div className="content-container">
        <p className="champ-not-found">Championship not found</p>
      </div>
    )
  }

  // Determine if current user is the adjudicator or admin.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const isAdmin = user.permissions?.admin === true
  const canAccessSettings = isAdjudicator || isAdmin
  const isCompetitor = champ.competitors.some(c => c._id === user._id)

  // Active round index and data - the round currently in progress (for status views/API calls).
  const activeRoundIndex = champ.rounds.findIndex(r => r.status !== "completed" && r.status !== "waiting")
  const activeRound = activeRoundIndex >= 0 ? champ.rounds[activeRoundIndex] : null

  // Round number for display - shows active round when in progress, otherwise completed count.
  const viewedRoundNumber = activeRoundIndex >= 0
    ? activeRoundIndex + 1  // Show active round number when a round is in progress.
    : (completedRoundsCount > 0 ? viewedIndex + 1 : 0)  // Show viewed completed round.

  // Pass session banner data to ChampBanner only when in F1 session view.
  const sessionBannerData = isAPISessionView ? sessionBanner : undefined

  // Grouped toolbar props for form views.
  const settingsToolbarProps: FormToolbarProps = {
    formErr: settingsFormErr,
    onSubmit: handleSettingsSubmit,
    changed: settingsChanged,
    loading: settingsLoading,
  }

  const automationToolbarProps: FormToolbarProps = {
    formErr: automationFormErr,
    onSubmit: handleAutomationSubmit,
    changed: automationChanged,
    loading: automationLoading,
  }

  const protestSettingsToolbarProps: FormToolbarProps = {
    formErr: protestsFormErr,
    onSubmit: handleProtestsSubmit,
    changed: protestsChanged,
    loading: protestsLoading,
  }

  const ruleChangesToolbarProps: FormToolbarProps = {
    formErr: ruleChangesFormErr,
    onSubmit: handleRuleChangesSubmit,
    changed: ruleChangesChanged,
    loading: ruleChangesLoading,
  }

  const adminToolbarProps: FormToolbarProps = {
    formErr: adminFormErr,
    onSubmit: handleAdminSubmit,
    changed: adminChanged,
    loading: adminLoading,
  }

  // Grouped toolbar props for badge view.
  const badgeToolbarProps: BadgeToolbarProps = {
    onAdd: () => setBadgeIsEdit(true),
    onFilter: () => setBadgeDraw(!badgeDraw),
    isEdit: badgeIsEdit,
    onBack: () => setBadgeIsEdit(false),
    onDelete: badgeEditHandlers?.delete,
    onRemove: badgeEditHandlers?.remove,
    onSubmit: badgeEditHandlers?.submit,
    loading: badgeEditHandlers?.loading,
    deleteLoading: badgeEditHandlers?.deleteLoading,
    removeLoading: badgeEditHandlers?.removeLoading,
    canSubmit: badgeEditHandlers?.canSubmit,
    canRemove: badgeEditHandlers?.canRemove,
  }

  // Grouped toolbar props for rules and regs view.
  const rulesAndRegsToolbarProps: RulesAndRegsToolbarProps = {
    onAdd: () => setRulesAndRegsIsEdit({ newRuleReg: true, index: null, ruleReg: null }),
    isEdit: rulesAndRegsIsEdit.newRuleReg || rulesAndRegsIsEdit.ruleReg !== null,
    isNewRule: rulesAndRegsIsEdit.newRuleReg,
    onBack: () => setRulesAndRegsIsEdit(initEditState),
    onDelete: rulesAndRegsEditHandlers?.onDelete,
    onSubmit: rulesAndRegsEditHandlers?.onSubmit,
    loading: rulesAndRegsEditHandlers?.loading,
    deleteLoading: rulesAndRegsEditHandlers?.deleteLoading,
    delConfirm: rulesAndRegsEditHandlers?.delConfirm,
    onDelConfirmBack: () => rulesAndRegsEditHandlers?.setDelConfirm(false),
  }

  // Grouped toolbar props for protests view.
  const protestsToolbarProps: ProtestsToolbarProps = {
    onCreateProtest: () => {
      const hasCompletedRound = champ.rounds.some((r) => r.status === "completed")
      if (!hasCompletedRound) {
        setShowProtestBlocked(true)
      } else {
        setShowCreateProtest(true)
      }
    },
    canCreateProtest: isCompetitor && !showCreateProtest,
    isCreating: showCreateProtest,
    onCancelCreate: () => setShowCreateProtest(false),
    onSubmitCreate: () => createProtestSubmitRef.current?.(),
    createLoading: createProtestLoading,
  }

  // Handle create protest success.
  const handleCreateProtestSuccess = (protest: ProtestType) => {
    setShowCreateProtest(false)
    // Add new protest to list.
    setProtests(prev => [protest, ...prev])
    // Navigate to the newly created protest.
    setSelectedProtestId(protest._id)
    setView("protest")
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
            bannerRef={bannerRef}
            shrinkState={shrinkState}
            viewedRoundNumber={viewedRoundNumber}
            sessionBanner={sessionBannerData}
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
            bannerRef={bannerRef}
            shrinkState={shrinkState}
            viewedRoundNumber={viewedRoundNumber}
            sessionBanner={sessionBannerData}
          />
        )
      ) : (
        <ChampBanner champ={champ} readOnly onBannerClick={handleBannerClick} bannerRef={bannerRef} shrinkState={shrinkState} viewedRoundNumber={viewedRoundNumber} sessionBanner={sessionBannerData} />
      )}

      {view === "competitors" && !isInRoundStatusView && !showStartConfirm && !showBanConfirm && !showKickConfirm && !showPromoteConfirm && !showInviteFullConfirm && !showAcceptInviteFullConfirm && !showLeaveConfirm && (
        <div className={`action-bar${isAdjudicator ? ' action-bar--adjudicator' : ''}${adjudicatorView ? ' action-bar--active' : ''}`}>
          <div className="action-bar-inner">
            {isAdjudicator && <AdjudicatorBar/>}
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
          </div>
        </div>
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
          if (seriesConfig) {
            return (
              <seriesConfig.View
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
        {isInRoundStatusView && roundStatusView === "results" && activeRound && champ && (
          <ResultsView
            round={activeRound}
            rounds={champ.rounds}
            currentRoundIndex={activeRoundIndex}
            isAdjudicator={isAdjudicator}
            onSkipTimer={() => setRoundStatusView(null)}
          />
        )}

        {/* Start Round Confirmation - shown before countdown begins */}
        {showStartConfirm && (
          <Confirm
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

        {/* Ban competitor confirmation dialog */}
        {showBanConfirm && competitorToBan && (
          <Confirm
            variant="danger"
            icon={<BlockIcon />}
            heading={`Ban ${competitorToBan.competitor?.name ?? competitorToBan.deletedUserSnapshot?.name ?? "Competitor"}?`}
            paragraphs={[
              "This competitor will be banned from the championship.",
              "They will not be able to rejoin.",
              "Their current points will remain but they will be marked as inactive."
            ]}
            cancelText="Cancel"
            confirmText="Ban Competitor"
            onCancel={() => {
              setShowBanConfirm(false)
              setCompetitorToBan(null)
            }}
            onConfirm={async () => {
              const competitorId = competitorToBan.competitor?._id
              if (!competitorId) return
              await banCompetitor(
                champ._id,
                competitorId,
                setChamp,
                user,
                setUser,
                navigate,
                setBackendErr,
              )
              setShowBanConfirm(false)
              setCompetitorToBan(null)
            }}
          />
        )}

        {/* Kick competitor confirmation dialog */}
        {showKickConfirm && competitorToKick && (
          <Confirm
            variant="default"
            icon={<BlockIcon />}
            heading={`Kick ${competitorToKick.competitor?.name ?? "Competitor"}?`}
            paragraphs={[
              "This competitor will be removed from the championship.",
              "They can rejoin later if they wish.",
              "Their current points will remain but they will be marked as inactive."
            ]}
            cancelText="Cancel"
            confirmText="Kick Competitor"
            onCancel={() => {
              setShowKickConfirm(false)
              setCompetitorToKick(null)
            }}
            onConfirm={async () => {
              const competitorId = competitorToKick.competitor?._id
              if (!competitorId) return
              await kickCompetitor(
                champ._id,
                competitorId,
                setChamp,
                user,
                setUser,
                navigate,
                setBackendErr,
              )
              setShowKickConfirm(false)
              setCompetitorToKick(null)
            }}
          />
        )}

        {/* Promote competitor confirmation dialog */}
        {showPromoteConfirm && competitorToPromote && (
          <Confirm
            variant="success"
            icon={<SwapHorizIcon />}
            heading={`Promote ${competitorToPromote.competitor?.name ?? "Competitor"}?`}
            paragraphs={[
              `${competitorToPromote.competitor?.name ?? "This competitor"} will become the new adjudicator of this championship.`,
              "There can only be one adjudicator per championship.",
              "You will lose your adjudicator status for this championship."
            ]}
            cancelText="Cancel"
            confirmText="Promote to Adjudicator"
            onCancel={() => {
              setShowPromoteConfirm(false)
              setCompetitorToPromote(null)
            }}
            onConfirm={async () => {
              const competitorId = competitorToPromote.competitor?._id
              if (!competitorId) return

              // Check if current user is the adjudicator BEFORE promotion.
              const wasAdjudicator = champ.adjudicator?.current?._id === user._id

              const success = await promoteAdjudicator(
                champ._id,
                competitorId,
                setChamp,
                user,
                setUser,
                navigate,
                setBackendErr,
              )

              // Fallback: exit adjudicator view if user was the old adjudicator.
              // This ensures view is reset even if WebSocket fails.
              if (success && wasAdjudicator) {
                setAdjudicatorView(false)
              }

              setShowPromoteConfirm(false)
              setCompetitorToPromote(null)
            }}
          />
        )}

        {/* Default competitors view - shown when not in active round status */}
        {view === "competitors" && !isInRoundStatusView && !showStartConfirm && !showBanConfirm && !showKickConfirm && !showPromoteConfirm && !showInviteFullConfirm && !showAcceptInviteFullConfirm && !showLeaveConfirm && (
          <div className="championship-list">
              {standingsView === "competitors" && viewedRound && (() => {
                // Filter out inactive competitors with 0 points in normal view only.
                // Adjudicator view shows all competitors.
                const filteredCompetitors = adjudicatorView
                  ? competitors
                  : competitors.filter(c => !(c.isInactive && c.grandTotalPoints === 0))

                return filteredCompetitors.map((c, i) => {
                  // Get competitor ID - use snapshot for deleted users.
                  const competitorId = c.competitor?._id ?? c.deletedUserSnapshot?._id
                  return (
                  <CompetitorListCard
                    key={competitorId || i}
                    highlight={justJoined && competitorId === user._id}
                    entry={{ ...c, position: i + 1 }}
                    adjudicatorView={adjudicatorView}
                    isInactive={c.isInactive}
                    isBanned={c.isBanned}
                    isKicked={c.isKicked}
                    isDeleted={c.isDeleted}
                    isSelf={competitorId === user._id}
                    isAdjudicator={competitorId === champ.adjudicator?.current?._id}
                    isAdmin={c.competitor?.permissions?.admin === true}
                    onKickClick={() => {
                      setCompetitorToKick(c)
                      setShowKickConfirm(true)
                    }}
                    onBanClick={() => {
                      setCompetitorToBan(c)
                      setShowBanConfirm(true)
                    }}
                    onPromoteClick={() => {
                      setCompetitorToPromote(c)
                      setShowPromoteConfirm(true)
                    }}
                    onUnbanClick={() => {
                      if (!competitorId) return
                      unbanCompetitor(
                        champ._id,
                        competitorId,
                        setChamp,
                        user,
                        setUser,
                        navigate,
                        setBackendErr,
                      )
                    }}
                    onPointsChange={(change) => {
                      if (!competitorId) return
                      adjustCompetitorPoints(
                        champ._id,
                        competitorId,
                        change,
                        setChamp,
                        user,
                        setUser,
                        navigate,
                        setBackendErr,
                      )
                    }}
                  />
                )})
              })()}
              {standingsView === "drivers" && viewedRound &&
                getAllDriversForRound(champ.series, viewedRound).map((d, i) => (
                  <DriverListCard
                    key={d.driver._id || i}
                    driver={d.driver}
                    entry={{ ...d, position: i + 1 }}
                    onClick={() => navigate(`/driver/${d.driver._id}`, { state: { driver: d.driver } })}
                    onTeamClick={(team) => navigate(`/team/${team._id}`, { state: { team } })}
                  />
                ))
              }
              {standingsView === "teams" && viewedRound &&
                getAllTeamsForRound(champ.series, viewedRound).map((t, i) => (
                  <TeamListCard
                    key={t.team._id || i}
                    team={t.team}
                    entry={{ ...t, position: i + 1 }}
                    onClick={() => navigate(`/team/${t.team._id}`, { state: { team: t.team } })}
                    onDriverClick={(driver) => navigate(`/driver/${driver._id}`, { state: { driver } })}
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
            isCompetitor={isCompetitor}
            onLeaveChampionship={() => setShowLeaveConfirm(true)}
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

        {view === "protestSettings" && (
          <ProtestSettings
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

        {view === "rulesAndRegs" && (
          <RulesAndRegs
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            navigate={navigate}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            isAdjudicator={isAdjudicator}
            isAdmin={isAdmin}
            isEdit={rulesAndRegsIsEdit}
            setIsEdit={setRulesAndRegsIsEdit}
            onEditHandlersReady={setRulesAndRegsEditHandlers}
          />
        )}

        {view === "admin" && isAdmin && (
          <Admin
            adminForm={adminForm}
            setAdminForm={setAdminForm}
          />
        )}

        {/* Invite view for adjudicators to invite users */}
        {view === "invite" && (
          <Invite
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            navigate={navigate}
            setBackendErr={setBackendErr}
          />
        )}

        {/* Protest blocked - no completed rounds */}
        {view === "protests" && showProtestBlocked && (
          <Confirm
            variant="dark"
            icon={<BlockIcon />}
            heading="Cannot File Protest"
            paragraphs={["At least one round must be completed before a protest can be filed."]}
            confirmText="Back"
            onConfirm={() => setShowProtestBlocked(false)}
            singleButton
          />
        )}

        {/* Protests view */}
        {view === "protests" && !showProtestBlocked && (
          <Protests
            champ={champ}
            user={user}
            setUser={setUser}
            protests={protests}
            onProtestClick={(protest) => handleProtestClick(protest._id)}
            showCreateForm={showCreateProtest}
            setBackendErr={setBackendErr}
            onCreateSuccess={handleCreateProtestSuccess}
            onCreateCancel={() => setShowCreateProtest(false)}
            onSubmitRef={createProtestSubmitRef}
            setCreateLoading={setCreateProtestLoading}
          />
        )}

        {/* Protest detail view */}
        {view === "protest" && selectedProtestId && (
          <Protest
            champ={champ}
            setChamp={setChamp}
            user={user}
            setUser={setUser}
            protestId={selectedProtestId}
            setBackendErr={setBackendErr}
            onBack={() => {
              setSelectedProtestId(null)
              setView("protests")
            }}
            onConfirmChange={setProtestConfirmActive}
          />
        )}

        {/* Demo mode - session picker or replay (uses series-specific components) */}
        {view === "demoMode" && !demoSession && seriesConfig?.DemoPicker && (
          <seriesConfig.DemoPicker onSelect={setDemoSession} />
        )}
        {view === "demoMode" && demoSession && seriesConfig && (
          <seriesConfig.View demoMode sessionLabel={demoSession.label} demoEnded={sessionBanner.demoEnded} />
        )}

        {/* Invite full confirmation - adjudicator trying to invite when championship is full */}
        {showInviteFullConfirm && (
          <Confirm
            variant="default"
            icon={<BlockIcon />}
            heading="Championship Full"
            paragraphs={[
              "This championship has reached its maximum number of competitors.",
              "You can increase the maximum in Settings, but this is not recommended."
            ]}
            confirmText="Go Back"
            onConfirm={() => setShowInviteFullConfirm(false)}
            singleButton={true}
          />
        )}

        {/* Accept invite full confirmation - invited user trying to join when championship is full */}
        {showAcceptInviteFullConfirm && (
          <Confirm
            variant="default"
            icon={<BlockIcon />}
            heading="Cannot Join Championship"
            paragraphs={[
              "This championship has reached its maximum number of competitors.",
              "You were invited but the championship filled up before you could accept.",
              "Contact the adjudicator if you believe this is an error."
            ]}
            confirmText="Go Back"
            onConfirm={() => setShowAcceptInviteFullConfirm(false)}
            singleButton={true}
          />
        )}

        {showLeaveConfirm && (
          <Confirm
            variant="default"
            icon={<ExitToAppIcon />}
            heading="Leave Championship?"
            paragraphs={[
              "You are about to leave this championship.",
              "Your current points will remain but you will be marked as inactive.",
              "You can rejoin later if you wish."
            ]}
            cancelText="Cancel"
            confirmText="Leave Championship"
            onCancel={() => setShowLeaveConfirm(false)}
            onConfirm={handleLeaveChampionship}
            loading={leavingChamp}
          />
        )}

        {/* ChampToolbar - hidden when any fullscreen overlay is active */}
        {!isOverlayActive && (
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
            adjudicatorView={adjudicatorView}
            onExitAdjudicatorView={() => setAdjudicatorView(false)}
            navigateToView={navigateToView}
            setShowInviteFullConfirm={setShowInviteFullConfirm}
            setShowAcceptInviteFullConfirm={setShowAcceptInviteFullConfirm}
            settingsProps={settingsToolbarProps}
            automationProps={automationToolbarProps}
            protestSettingsProps={protestSettingsToolbarProps}
            ruleChangesProps={ruleChangesToolbarProps}
            adminProps={adminToolbarProps}
            badgeProps={badgeToolbarProps}
            rulesAndRegsProps={rulesAndRegsToolbarProps}
            protestsProps={protestsToolbarProps}
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
        isAdjudicator={isAdjudicator}
        adjudicatorViewActive={adjudicatorView}
        onToggleAdjudicatorView={() => setAdjudicatorView(prev => !prev)}
      />
    </>
  )
}

export default Championship
