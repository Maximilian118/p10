import React, { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { ChampType, formErrType, formType } from "../../shared/types"
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
import { getChampById, updateChampSettings } from "../../shared/requests/champRequests"
import { uplaodS3 } from "../../shared/requests/bucketRequests"
import { presetArrays } from "../../components/utility/pointsPicker/ppPresets"

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
    pointsStructure: presetArrays(1).map(item => ({
      position: item.result,
      points: item.value,
    })),
    icon: null,
    profile_picture: null,
  })
  const [ settingsFormErr, setSettingsFormErr ] = useState<ChampSettingsFormErrType>({
    champName: "",
    rounds: "",
    pointsStructure: "",
    dropzone: "",
  })

  // Ref to expose DropZone's open function for external triggering.
  const dropzoneOpenRef = useRef<(() => void) | null>(null)
  const [ justJoined, setJustJoined ] = useState<boolean>(false)
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
        pointsStructure: champ.pointsStructure,
        icon: null,
        profile_picture: null,
      })
    }
  }, [champ])

  // Check if settings form has changes compared to champ data.
  const settingsChanged = champ
    ? settingsForm.champName !== champ.name ||
      settingsForm.rounds !== champ.rounds.length ||
      JSON.stringify(settingsForm.pointsStructure) !== JSON.stringify(champ.pointsStructure) ||
      settingsForm.icon !== null ||
      settingsForm.profile_picture !== null
    : false

  // Handle settings form submission with optimistic updates.
  const handleSettingsSubmit = async () => {
    if (!champ) return

    // Build updates object with only changed fields.
    const updates: {
      name?: string
      rounds?: number
      pointsStructure?: typeof settingsForm.pointsStructure
      icon?: string
      profile_picture?: string
    } = {}

    if (settingsForm.champName !== champ.name) {
      updates.name = settingsForm.champName
    }

    if (settingsForm.rounds !== champ.rounds.length) {
      updates.rounds = settingsForm.rounds
    }

    if (JSON.stringify(settingsForm.pointsStructure) !== JSON.stringify(champ.pointsStructure)) {
      updates.pointsStructure = settingsForm.pointsStructure
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
      <div className="content-container">
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
            />
          )
        ) : (
          <ChampBanner champ={champ} readOnly onBannerClick={() => navigateToView("competitors")} />
        )}

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
