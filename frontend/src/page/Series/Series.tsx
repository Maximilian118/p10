import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_series.scss'
import { driverType, seriesType } from "../../shared/types"
import EditButton from "../../components/utility/button/editButton/EditButton"
import AppContext from "../../context"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getSeriesById } from "../../shared/requests/seriesRequests"
import { canEditEntity } from "../../shared/entityPermissions"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ImageIcon from "../../components/utility/icon/imageIcon/ImageIcon"

// Series profile page displaying series icon, name, and driver grid.
const Series: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [series, setSeries] = useState<seriesType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch series by ID on mount.
  useEffect(() => {
    if (id) {
      getSeriesById(id, setSeries, user, setUser, navigate, setLoading, setBackendErr)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Navigate to driver profile.
  const handleDriverClick = (driver: driverType) => {
    navigate(`/driver/${driver._id}`)
  }

  // Navigate to edit form with series data.
  const handleEdit = () => {
    navigate("/create-series", { state: { series } })
  }

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container series-profile">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message || !series) {
    return (
      <div className="content-container series-profile">
        <ErrorDisplay backendErr={backendErr.message ? backendErr : { ...initGraphQLError, message: "Series not found" }} />
      </div>
    )
  }

  // Check if user has permission to edit this series using usage-scoped adjudicator model.
  const canEdit = canEditEntity(series, user, series.championships || [])

  return (
    <div className="content-container series-profile">
      <div className="series-icon-container">
        <ImageIcon src={series.icon} size="contained" background />
      </div>
      <div className="series-profile-content">
        <h2>{series.name}</h2>
        <div className="series-drivers-grid">
          {series.drivers.map((driver) => (
            <div key={driver._id} className="series-driver-icon" onClick={() => handleDriverClick(driver)}>
              <ImageIcon src={driver.icon} size="large" />
              <p>{driver.name}</p>
            </div>
          ))}
        </div>
      </div>
      {canEdit &&
        <EditButton
          onClick={handleEdit}
          size="medium"
          absolute
        />
      }
    </div>
  )
}

export default Series
