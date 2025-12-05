import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_championship.scss'
import AppContext from "../../context"
import { champType, formErrType, formType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getChamp } from "../../shared/requests/champRequests"
import ChampBanner from "../../components/cards/champBanner/ChampBanner"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ChampToolbar from "../../components/utility/champToolbar/ChampToolbar"

const Championship: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const [ champ, setChamp ] = useState<champType | null>(null)
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

  const navigate = useNavigate()

  // Fetch championship data when ID changes.
  useEffect(() => {
    if (id) {
      getChamp(id, setChamp, user, setUser, navigate, setLoading, setBackendErr)
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

  // Determine if current user is the adjudicator.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id

  return (
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
        />
      ) : (
        <ChampBanner champ={champ} readOnly />
      )}
      <ChampToolbar />
    </div>
  )
}

export default Championship
