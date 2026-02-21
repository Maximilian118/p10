import React, { useContext, useEffect, useState } from "react"
import { seriesType } from "../shared/types"
import Search from "../components/utility/search/Search"
import ButtonBar from "../components/utility/buttonBar/ButtonBar"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getSeries } from "../shared/requests/seriesRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import SeriesListCard from "../components/cards/seriesListCard/SeriesListCard"
import InfoModal from "../components/modal/configs/InfoModal/InfoModal"
import { tooltips } from "../shared/tooltip"
import { Info, Add } from "@mui/icons-material"

// Page for displaying all series.
const SeriesList: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ seriesList, setSeriesList ] = useState<seriesType[]>([])
  const [ search, setSearch ] = useState<seriesType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ showInfo, setShowInfo ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()
  const location = useLocation()
  const newSeriesId = (location.state as { newSeriesId?: string })?.newSeriesId

  // Fetch all series on mount.
  useEffect(() => {
    getSeries(setSeriesList, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set search results when series list is fetched.
  useEffect(() => {
    setSearch(seriesList)
  }, [seriesList])

  // Render the list of series.
  const renderSeriesList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/>
    }

    return (
      search.map((series, i) => (
        <SeriesListCard
          key={i}
          series={series}
          onClick={() => navigate(`/series/${series._id}`)}
          onDriverClick={(driver) => navigate(`/driver/${driver._id}`, { state: { driver } })}
          highlight={series._id === newSeriesId}
        />
      ))
    )
  }

  return (
    <div className="content-container champs-container">
      <Search
        original={seriesList}
        setSearch={setSearch}
        label="Search Series"
      />
      <div className="champs-list">
        {renderSeriesList()}
      </div>
      <ButtonBar
        rightButtons={[
          { onClick: () => setShowInfo(true), startIcon: <Info />, className: "info-button" },
          { onClick: () => navigate("/create-series"), startIcon: <Add />, className: "add-button" },
        ]}
      />
      {showInfo && (
        <InfoModal
          title={tooltips.series.title}
          description={[...tooltips.series.description]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}

export default SeriesList
