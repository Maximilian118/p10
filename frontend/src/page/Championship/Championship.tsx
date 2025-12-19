import React, { useContext, useEffect, useState } from "react"
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
import ChampSettings, { ChampView } from "./Views/ChampSettings/ChampSettings"
import { getChampById } from "../../shared/requests/champRequests"

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
            setUser={setUser}
            navigate={navigate}
            setView={navigateToView}
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
