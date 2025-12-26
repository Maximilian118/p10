import React, { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { ChampType, formErrType, formType, seriesType } from "../../shared/types"
import { getCompetitors } from "../../shared/utility"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import ChampBanner from "../../components/cards/champBanner/ChampBanner"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ChampToolbar from "../../components/utility/champToolbar/ChampToolbar"
import CompetitorCard from "../../components/cards/competitorCard/CompetitorCard"
import ViewsDrawer from "./ViewsDrawer/ViewsDrawer"
import ChampSettings, { ChampView, ChampSettingsFormType, ChampSettingsFormErrType } from "./Views/ChampSettings/ChampSettings"
import DeleteChamp from "./Views/DeleteChamp/DeleteChamp"
import Automation, { AutomationFormType, AutomationFormErrType } from "./Views/Automation/Automation"
import Protests from "./Views/Protests/Protests"
import RuleChanges from "./Views/RuleChanges/RuleChanges"
import SeriesPicker from "../../components/utility/seriesPicker/SeriesPicker"
import { ProtestsFormType, ProtestsFormErrType, RuleChangesFormType, RuleChangesFormErrType } from "../../shared/formValidation"
import { getChampById, updateChampSettings } from "../../shared/requests/champRequests"
import { uplaodS3 } from "../../shared/requests/bucketRequests"
import { presetArrays } from "../../components/utility/pointsPicker/ppPresets"
import { useScrollShrink } from "../../shared/hooks/useScrollShrink"

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
    inviteOnly: false,
    active: true,
    series: null,
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
  const [ seriesList, setSeriesList ] = useState<seriesType[]>([])

  // Ref to expose DropZone's open function for external triggering.
  const dropzoneOpenRef = useRef<(() => void) | null>(null)
  const [ justJoined, setJustJoined ] = useState<boolean>(false)

  // Scroll-based shrinking for banner.
  const { shrinkRatio, handleScroll } = useScrollShrink({ threshold: 70 })
  const [ drawerOpen, setDrawerOpen ] = useState<boolean>(false)
  const [ view, setView ] = useState<ChampView>("competitors")
  const [ viewHistory, setViewHistory ] = useState<ChampView[]>([])

  const navigate = useNavigate()

  // Navigate to a new view while tracking history.
  const navigateToView = (newView: ChampView) => {
    if (newView !== view) {
      setViewHistory(prev => [...prev, view])
      setView(newView)
    }
  }

  // Navigate back to the previous view.
  const navigateBack = () => {
    if (viewHistory.length > 0) {
      const previousView = viewHistory[viewHistory.length - 1]
      setViewHistory(prev => prev.slice(0, -1))
      setView(previousView)
    }
  }

  // Navigate directly to the default view and clear history.
  const navigateToDefault = () => {
    setView("competitors")
    setViewHistory([])
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
      setSettingsForm({
        champName: champ.name,
        rounds: champ.rounds.length,
        maxCompetitors: champ.settings.maxCompetitors,
        pointsStructure: champ.pointsStructure,
        icon: null,
        profile_picture: null,
        inviteOnly: champ.settings.inviteOnly,
        active: champ.active,
        series: champ.series,
      })
    }
  }, [champ])

  // Initialize automation form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      setAutomationForm({
        enabled: champ.settings.automation?.enabled ?? false,
        autoOpen: champ.settings.automation?.bettingWindow?.autoOpen ?? false,
        autoOpenTime: champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10,
        autoClose: champ.settings.automation?.bettingWindow?.autoClose ?? false,
        autoCloseTime: champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5,
        autoNextRound: champ.settings.automation?.round?.autoNextRound ?? false,
        autoNextRoundTime: champ.settings.automation?.round?.autoNextRoundTime ?? 60,
      })
    }
  }, [champ])

  // Initialize protests form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      // Convert expiry from minutes to days (divide by 1440).
      const expiryDays = Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
      setProtestsForm({
        alwaysVote: champ.settings.protests?.alwaysVote ?? false,
        allowMultiple: champ.settings.protests?.allowMultiple ?? false,
        expiry: expiryDays,
      })
    }
  }, [champ])

  // Initialize rule changes form when champ data is loaded.
  useEffect(() => {
    if (champ) {
      // Convert expiry from minutes to days (divide by 1440).
      const expiryDays = Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
      setRuleChangesForm({
        alwaysVote: champ.settings.ruleChanges?.alwaysVote ?? false,
        allowMultiple: champ.settings.ruleChanges?.allowMultiple ?? false,
        expiry: expiryDays,
      })
    }
  }, [champ])

  // Check if settings form has changes compared to champ data.
  const settingsChanged = champ
    ? settingsForm.champName !== champ.name ||
      settingsForm.rounds !== champ.rounds.length ||
      settingsForm.maxCompetitors !== champ.settings.maxCompetitors ||
      JSON.stringify(settingsForm.pointsStructure) !== JSON.stringify(champ.pointsStructure) ||
      settingsForm.icon !== null ||
      settingsForm.profile_picture !== null ||
      settingsForm.inviteOnly !== champ.settings.inviteOnly ||
      settingsForm.active !== champ.active ||
      settingsForm.series?._id !== champ.series._id
    : false

  // Check if automation form has changes compared to champ data.
  const automationChanged = champ
    ? automationForm.enabled !== (champ.settings.automation?.enabled ?? false) ||
      automationForm.autoOpen !== (champ.settings.automation?.bettingWindow?.autoOpen ?? false) ||
      automationForm.autoOpenTime !== (champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10) ||
      automationForm.autoClose !== (champ.settings.automation?.bettingWindow?.autoClose ?? false) ||
      automationForm.autoCloseTime !== (champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5) ||
      automationForm.autoNextRound !== (champ.settings.automation?.round?.autoNextRound ?? false) ||
      automationForm.autoNextRoundTime !== (champ.settings.automation?.round?.autoNextRoundTime ?? 60)
    : false

  // Check if protests form has changes compared to champ data.
  const protestsChanged = champ
    ? protestsForm.alwaysVote !== (champ.settings.protests?.alwaysVote ?? false) ||
      protestsForm.allowMultiple !== (champ.settings.protests?.allowMultiple ?? false) ||
      protestsForm.expiry !== Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
    : false

  // Check if rule changes form has changes compared to champ data.
  const ruleChangesChanged = champ
    ? ruleChangesForm.alwaysVote !== (champ.settings.ruleChanges?.alwaysVote ?? false) ||
      ruleChangesForm.allowMultiple !== (champ.settings.ruleChanges?.allowMultiple ?? false) ||
      ruleChangesForm.expiry !== Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
    : false

  // Handle settings form submission with optimistic updates.
  const handleSettingsSubmit = async () => {
    if (!champ) return

    // Build updates object with only changed fields.
    const updates: {
      name?: string
      rounds?: number
      maxCompetitors?: number
      pointsStructure?: typeof settingsForm.pointsStructure
      icon?: string
      profile_picture?: string
      inviteOnly?: boolean
      active?: boolean
      series?: string
    } = {}

    if (settingsForm.champName !== champ.name) {
      updates.name = settingsForm.champName
    }

    if (settingsForm.rounds !== champ.rounds.length) {
      updates.rounds = settingsForm.rounds
    }

    if (settingsForm.maxCompetitors !== champ.settings.maxCompetitors) {
      updates.maxCompetitors = settingsForm.maxCompetitors
    }

    if (JSON.stringify(settingsForm.pointsStructure) !== JSON.stringify(champ.pointsStructure)) {
      updates.pointsStructure = settingsForm.pointsStructure
    }

    if (settingsForm.inviteOnly !== champ.settings.inviteOnly) {
      updates.inviteOnly = settingsForm.inviteOnly
    }

    if (settingsForm.active !== champ.active) {
      updates.active = settingsForm.active
    }

    if (settingsForm.series?._id !== champ.series._id && settingsForm.series?._id) {
      updates.series = settingsForm.series._id
    }

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
        2, // Delete old version.
      )
      if (!iconURL) return // S3 upload failed.
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
        2, // Delete old version.
      )
      if (!ppURL) return // S3 upload failed.
      updates.profile_picture = ppURL
    }

    // Exit early if no changes.
    if (Object.keys(updates).length === 0) return

    // Store previous state for rollback.
    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => {
      if (!prev) return prev

      const optimisticChamp = { ...prev }

      if (updates.name) {
        optimisticChamp.name = updates.name
      }

      if (updates.pointsStructure) {
        optimisticChamp.pointsStructure = updates.pointsStructure
      }

      if (updates.maxCompetitors) {
        optimisticChamp.settings = {
          ...optimisticChamp.settings,
          maxCompetitors: updates.maxCompetitors,
        }
      }

      if (typeof updates.inviteOnly === "boolean") {
        optimisticChamp.settings = {
          ...optimisticChamp.settings,
          inviteOnly: updates.inviteOnly,
        }
      }

      if (typeof updates.active === "boolean") {
        optimisticChamp.active = updates.active
      }

      if (updates.icon) {
        optimisticChamp.icon = updates.icon
      }

      if (updates.profile_picture) {
        optimisticChamp.profile_picture = updates.profile_picture
      }

      if (updates.rounds) {
        const currentRoundsCount = prev.rounds.length

        if (updates.rounds > currentRoundsCount) {
          // Add new waiting rounds.
          const newRounds = [...prev.rounds]
          for (let i = currentRoundsCount + 1; i <= updates.rounds; i++) {
            newRounds.push({
              round: i,
              status: "waiting" as const,
              winner: null,
              runnerUp: null,
              competitors: [],
              drivers: [],
              teams: [],
            })
          }
          optimisticChamp.rounds = newRounds
        } else if (updates.rounds < currentRoundsCount) {
          // Remove rounds from the end.
          optimisticChamp.rounds = prev.rounds.slice(0, updates.rounds)
        }
      }

      if (updates.series && settingsForm.series) {
        optimisticChamp.series = settingsForm.series
      }

      return optimisticChamp
    })

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
      // Success: update with server response and reset icon form fields.
      setChamp(result)
      setSettingsForm(prev => ({ ...prev, icon: null, profile_picture: null }))
    } else {
      // Failure: rollback to previous state.
      setChamp(previousChamp)
    }
  }

  // Handle automation form submission with optimistic updates.
  const handleAutomationSubmit = async () => {
    if (!champ) return

    // Build automation updates object with only changed fields.
    const automationUpdates: {
      enabled?: boolean
      bettingWindow?: {
        autoOpen?: boolean
        autoOpenTime?: number
        autoClose?: boolean
        autoCloseTime?: number
      }
      round?: {
        autoNextRound?: boolean
        autoNextRoundTime?: number
      }
    } = {}

    if (automationForm.enabled !== (champ.settings.automation?.enabled ?? false)) {
      automationUpdates.enabled = automationForm.enabled
    }

    // Check betting window fields for changes.
    const bettingWindowUpdates: typeof automationUpdates.bettingWindow = {}

    if (automationForm.autoOpen !== (champ.settings.automation?.bettingWindow?.autoOpen ?? false)) {
      bettingWindowUpdates.autoOpen = automationForm.autoOpen
    }
    if (automationForm.autoOpenTime !== (champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10)) {
      bettingWindowUpdates.autoOpenTime = automationForm.autoOpenTime
    }
    if (automationForm.autoClose !== (champ.settings.automation?.bettingWindow?.autoClose ?? false)) {
      bettingWindowUpdates.autoClose = automationForm.autoClose
    }
    if (automationForm.autoCloseTime !== (champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5)) {
      bettingWindowUpdates.autoCloseTime = automationForm.autoCloseTime
    }

    if (Object.keys(bettingWindowUpdates).length > 0) {
      automationUpdates.bettingWindow = bettingWindowUpdates
    }

    // Check round automation fields for changes.
    const roundUpdates: typeof automationUpdates.round = {}

    if (automationForm.autoNextRound !== (champ.settings.automation?.round?.autoNextRound ?? false)) {
      roundUpdates.autoNextRound = automationForm.autoNextRound
    }
    if (automationForm.autoNextRoundTime !== (champ.settings.automation?.round?.autoNextRoundTime ?? 60)) {
      roundUpdates.autoNextRoundTime = automationForm.autoNextRoundTime
    }

    if (Object.keys(roundUpdates).length > 0) {
      automationUpdates.round = roundUpdates
    }

    // Exit early if no changes.
    if (Object.keys(automationUpdates).length === 0) return

    // Store previous state for rollback.
    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => {
      if (!prev) return prev
      return {
        ...prev,
        settings: {
          ...prev.settings,
          automation: {
            ...prev.settings.automation,
            enabled: automationUpdates.enabled ?? prev.settings.automation?.enabled ?? false,
            bettingWindow: {
              ...prev.settings.automation.bettingWindow,
              autoOpen: automationUpdates.bettingWindow?.autoOpen ?? prev.settings.automation.bettingWindow.autoOpen,
              autoOpenTime: automationUpdates.bettingWindow?.autoOpenTime ?? prev.settings.automation.bettingWindow.autoOpenTime,
              autoClose: automationUpdates.bettingWindow?.autoClose ?? prev.settings.automation.bettingWindow.autoClose,
              autoCloseTime: automationUpdates.bettingWindow?.autoCloseTime ?? prev.settings.automation.bettingWindow.autoCloseTime,
            },
            round: {
              ...prev.settings.automation.round,
              autoNextRound: automationUpdates.round?.autoNextRound ?? prev.settings.automation.round.autoNextRound,
              autoNextRoundTime: automationUpdates.round?.autoNextRoundTime ?? prev.settings.automation.round.autoNextRoundTime,
            },
          },
        },
      }
    })

    // Make the API request using updateChampSettings with automation parameter.
    const result = await updateChampSettings(
      champ._id,
      { automation: automationUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      // Success: update with server response.
      setChamp(result)
    } else {
      // Failure: rollback to previous state.
      setChamp(previousChamp)
    }
  }

  // Handle protests form submission with optimistic updates.
  const handleProtestsSubmit = async () => {
    if (!champ) return

    // Build protests updates object with only changed fields.
    const protestsUpdates: {
      alwaysVote?: boolean
      allowMultiple?: boolean
      expiry?: number
    } = {}

    if (protestsForm.alwaysVote !== (champ.settings.protests?.alwaysVote ?? false)) {
      protestsUpdates.alwaysVote = protestsForm.alwaysVote
    }

    if (protestsForm.allowMultiple !== (champ.settings.protests?.allowMultiple ?? false)) {
      protestsUpdates.allowMultiple = protestsForm.allowMultiple
    }

    // Convert days to minutes for the API.
    const currentExpiryDays = Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
    if (protestsForm.expiry !== currentExpiryDays) {
      protestsUpdates.expiry = protestsForm.expiry * 1440
    }

    // Exit early if no changes.
    if (Object.keys(protestsUpdates).length === 0) return

    // Store previous state for rollback.
    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => {
      if (!prev) return prev
      return {
        ...prev,
        settings: {
          ...prev.settings,
          protests: {
            ...prev.settings.protests,
            alwaysVote: protestsUpdates.alwaysVote ?? prev.settings.protests.alwaysVote,
            allowMultiple: protestsUpdates.allowMultiple ?? prev.settings.protests.allowMultiple,
            expiry: protestsUpdates.expiry ?? prev.settings.protests.expiry,
          },
        },
      }
    })

    // Make the API request.
    const result = await updateChampSettings(
      champ._id,
      { protests: protestsUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      // Success: update with server response.
      setChamp(result)
    } else {
      // Failure: rollback to previous state.
      setChamp(previousChamp)
    }
  }

  // Handle rule changes form submission with optimistic updates.
  const handleRuleChangesSubmit = async () => {
    if (!champ) return

    // Build rule changes updates object with only changed fields.
    const ruleChangesUpdates: {
      alwaysVote?: boolean
      allowMultiple?: boolean
      expiry?: number
    } = {}

    if (ruleChangesForm.alwaysVote !== (champ.settings.ruleChanges?.alwaysVote ?? false)) {
      ruleChangesUpdates.alwaysVote = ruleChangesForm.alwaysVote
    }

    if (ruleChangesForm.allowMultiple !== (champ.settings.ruleChanges?.allowMultiple ?? false)) {
      ruleChangesUpdates.allowMultiple = ruleChangesForm.allowMultiple
    }

    // Convert days to minutes for the API.
    const currentExpiryDays = Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
    if (ruleChangesForm.expiry !== currentExpiryDays) {
      ruleChangesUpdates.expiry = ruleChangesForm.expiry * 1440
    }

    // Exit early if no changes.
    if (Object.keys(ruleChangesUpdates).length === 0) return

    // Store previous state for rollback.
    const previousChamp = champ

    // Optimistic update: immediately reflect changes in UI.
    setChamp(prev => {
      if (!prev) return prev
      return {
        ...prev,
        settings: {
          ...prev.settings,
          ruleChanges: {
            ...prev.settings.ruleChanges,
            alwaysVote: ruleChangesUpdates.alwaysVote ?? prev.settings.ruleChanges.alwaysVote,
            allowMultiple: ruleChangesUpdates.allowMultiple ?? prev.settings.ruleChanges.allowMultiple,
            expiry: ruleChangesUpdates.expiry ?? prev.settings.ruleChanges.expiry,
          },
        },
      }
    })

    // Make the API request.
    const result = await updateChampSettings(
      champ._id,
      { ruleChanges: ruleChangesUpdates },
      user,
      setUser,
      navigate,
      setBackendErr,
    )

    if (result) {
      // Success: update with server response.
      setChamp(result)
    } else {
      // Failure: rollback to previous state.
      setChamp(previousChamp)
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
            onBannerClick={() => navigateToView("competitors")}
            settingsMode={true}
            openRef={dropzoneOpenRef}
            shrinkRatio={shrinkRatio}
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
            onBannerClick={() => navigateToView("competitors")}
            shrinkRatio={shrinkRatio}
          />
        )
      ) : (
        <ChampBanner champ={champ} readOnly onBannerClick={() => navigateToView("competitors")} shrinkRatio={shrinkRatio} />
      )}

      <div className="content-container" onScroll={handleScroll}>
        {view === "competitors" && (
          <div className="competitors-list">
            {getCompetitors(champ).map((c, i) => (
              <CompetitorCard
                key={c.competitor._id || i}
                competitor={c.competitor}
                highlight={justJoined && c.competitor._id === user._id}
              />
            ))}
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
          settingsFormErr={settingsFormErr}
          onSettingsSubmit={handleSettingsSubmit}
          settingsChanged={settingsChanged}
          automationFormErr={automationFormErr}
          onAutomationSubmit={handleAutomationSubmit}
          automationChanged={automationChanged}
          protestsFormErr={protestsFormErr}
          onProtestsSubmit={handleProtestsSubmit}
          protestsChanged={protestsChanged}
          ruleChangesFormErr={ruleChangesFormErr}
          onRuleChangesSubmit={handleRuleChangesSubmit}
          ruleChangesChanged={ruleChangesChanged}
        />
      </div>
      <ViewsDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        view={view}
        setView={navigateToView}
        onBackToDefault={navigateToDefault}
        canAccessSettings={canAccessSettings}
      />
    </>
  )
}

export default Championship
