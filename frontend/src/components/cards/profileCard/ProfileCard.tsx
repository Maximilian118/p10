import React, { useState } from "react"
import './_profileCard.scss'
import DropZone from "../../utility/dropZone/DropZone"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"
import { getPermLevel } from "../../../shared/utility"
import moment from "moment"
import { formErrType, formType } from "../../../shared/types"
import { Button, CircularProgress } from "@mui/material"
import { updatePP } from "../../../shared/requests/userRequests"
import { useNavigate } from "react-router-dom"

interface profileCardType<T, U> {
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

const ProfileCard = <T extends formType, U extends formErrType>({ user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr }: profileCardType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)

  const navigate = useNavigate()

  const uploadPPHandler = async () => {
    await updatePP(form, setForm, user, setUser, navigate, setLoading, setBackendErr)
  }

  const filesInForm = (form: T): JSX.Element => {
    if (!form.icon && !form.profile_picture) {
      return (
        <>
          <p>{user.name}</p>
          <h5 style={{ textTransform: "capitalize" }}>
            {`${getPermLevel(user)} since: ${moment(user.created_at).format("Do MMM YYYY")}`}
          </h5>
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
    <div className="profile-card">
      <DropZone<T, U>
        form={form}
        setForm={setForm}
        user={user}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="User"
        thumbImg={user.icon}
        style={{ width: 100, margin: 20 }}
      />
      <div className="profile-info">
        {filesInForm(form)}
      </div>
    </div>
  )
}

export default ProfileCard
