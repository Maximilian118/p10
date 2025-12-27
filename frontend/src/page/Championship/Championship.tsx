import React, { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { ChampType, formErrType, formType, seriesType } from "../../shared/types"
import { getCompetitorsFromRound, getAllDriversForRound, getAllTeamsForRound } from "../../shared/utility"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import ChampBanner from "../../components/cards/champBanner/ChampBanner"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ChampToolbar from "../../components/utility/champToolbar/ChampToolbar"
import CompetitorListCard from "../../components/cards/competitorListCard/CompetitorListCard"
import DriverListCard from "../../components/cards/driverListCard/DriverListCard"
import TeamListCard from "../../components/cards/teamListCard/TeamListCard"
import RoundsBar, { StandingsView } from "./RoundsBar/RoundsBar"
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
import {
  initSettingsForm,
  initAutomationForm,
  initProtestsForm,
  initRuleChangesForm,
  hasSettingsChanged,
  hasAutomationChanged,
  hasProtestsChanged,
  hasRuleChangesChanged,
  buildSettingsUpdates,
  buildAutomationUpdates,
  buildProtestsUpdates,
  buildRuleChangesUpdates,
  applySettingsOptimistically,
  applyAutomationOptimistically,
  applyProtestsOptimistically,
  applyRuleChangesOptimistically,
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

  // RoundsBar state - which round to view and which standings type.
  const [ viewedRoundIndex, setViewedRoundIndex ] = useState<number | null>(null)
  const [ standingsView, setStandingsView ] = useState<StandingsView>("competitors")

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

  // Check if forms have changes compared to champ data.
  const settingsChanged = champ ? hasSettingsChanged(settingsForm, champ) : false
  const automationChanged = champ ? hasAutomationChanged(automationForm, champ) : false
  const protestsChanged = champ ? hasProtestsChanged(protestsForm, champ) : false
  const ruleChangesChanged = champ ? hasRuleChangesChanged(ruleChangesForm, champ) : false

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

  // Compute round viewing state.
  const currentRoundIndex = champ.rounds.findIndex(r => r.status !== "completed")
  const effectiveCurrentIndex = currentRoundIndex === -1 ? champ.rounds.length - 1 : currentRoundIndex
  const viewedIndex = viewedRoundIndex ?? effectiveCurrentIndex
  const viewedRound = champ.rounds[viewedIndex]
  // Round number is 1-indexed for display.
  const viewedRoundNumber = viewedRound?.round ?? effectiveCurrentIndex + 1

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
            onBannerClick={() => navigateToView("competitors")}
            shrinkRatio={shrinkRatio}
            viewedRoundNumber={viewedRoundNumber}
          />
        )
      ) : (
        <ChampBanner champ={champ} readOnly onBannerClick={() => navigateToView("competitors")} shrinkRatio={shrinkRatio} viewedRoundNumber={viewedRoundNumber} />
      )}

      {view === "competitors" && (
        <RoundsBar
          totalRounds={champ.rounds.length}
          viewedRoundIndex={viewedIndex}
          currentRoundIndex={effectiveCurrentIndex}
          standingsView={standingsView}
          setViewedRoundIndex={setViewedRoundIndex}
          setStandingsView={setStandingsView}
          isAdjudicator={isAdjudicator}
        />
      )}

      <div className="content-container" onScroll={handleScroll}>
        {view === "competitors" && (
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
