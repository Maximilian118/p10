import React, { useState } from "react"
import './_champBanner.scss'
import DropZone from "../../utility/dropZone/DropZone"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"
import moment from "moment"
import { champType, formErrType, formType } from "../../../shared/types"
import { Button, CircularProgress } from "@mui/material"
import { updateChampPP } from "../../../shared/requests/champRequests"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

// Props for editable championship banner (when user is adjudicator).
interface champBannerEditableType<T, U> {
  champ: champType
  setChamp: React.Dispatch<React.SetStateAction<champType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  readOnly?: false
}

// Props for read-only championship banner (when user is not adjudicator).
interface champBannerReadOnlyType {
  champ: champType
  readOnly: true
}

type champBannerType<T, U> = champBannerEditableType<T, U> | champBannerReadOnlyType

// Displays championship banner with profile picture, name, and creation date.
// Editable mode allows adjudicator to update the profile picture.
const ChampBanner = <T extends formType, U extends formErrType>(props: champBannerType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const navigate = useNavigate()

  // Read-only mode for non-adjudicators.
  if (props.readOnly) {
    const { champ } = props
    return (
      <div className="champ-banner">
        <div className="champ-banner-icon-container">
          <ImageIcon src={champ.icon} size="contained" />
        </div>
        <div className="champ-banner-info">
          <p>{champ.name}</p>
          <h5>{`Created: ${moment(champ.created_at).format("Do MMM YYYY")}`}</h5>
        </div>
      </div>
    )
  }

  // Editable mode for adjudicator.
  const { champ, setChamp, user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr } = props

  // Handles profile picture upload for championship.
  const uploadPPHandler = async () => {
    await updateChampPP(champ._id, form, setForm, setChamp, user, setUser, navigate, setLoading, setBackendErr)
  }

  // Renders content based on whether files are selected.
  const filesInForm = (form: T): JSX.Element => {
    if (!form.icon && !form.profile_picture) {
      return (
        <>
          <p>{champ.name}</p>
          <h5>{`Created: ${moment(champ.created_at).format("Do MMM YYYY")}`}</h5>
        </>
      )
    } else {
      return (
        <>
          <p>Are you sure?</p>
          <Button
            variant="contained"
            className="mui-form-btn"
            style={{ margin: "5px 0 0 0" }}
            startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
            onClick={() => uploadPPHandler()}
          >Confirm</Button>
        </>
      )
    }
  }

  return (
    <div className="champ-banner">
      <DropZone<T, U>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Championship"
        thumbImg={champ.icon}
        style={{ width: 100, margin: 20 }}
      />
      <div className="champ-banner-info">
        {filesInForm(form)}
      </div>
    </div>
  )
}

export default ChampBanner
