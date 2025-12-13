import React, { useContext, useEffect, useState } from "react"
import { seriesType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate, useLocation } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getSeries } from "../shared/requests/seriesRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import SeriesListCard from "../components/cards/seriesListCard/SeriesListCard"

// Page for displaying all series.
const Series: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ seriesList, setSeriesList ] = useState<seriesType[]>([])
  const [ search, setSearch ] = useState<seriesType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
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
          onDriverClick={(driver) => navigate("/create-driver", { state: { driver } })}
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
      <AddButton
        onClick={() => navigate("/create-series")}
        absolute
      />
    </div>
  )
}

export default Series
