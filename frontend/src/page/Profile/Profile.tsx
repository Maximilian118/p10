import React, { useContext, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Settings } from "@mui/icons-material"
import "./_profile.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import { formErrType, formType } from "../../shared/types"
import FloatingButtonBar from "../../components/utility/floatingButtonBar/FloatingButtonBar"

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [form, setForm] = useState<formType>({
    icon: null,
    profile_picture: null,
    name: user.name,
    email: user.email,
  })
  const [formErr, setFormErr] = useState<formErrType>({
    name: "",
    email: "",
    dropzone: "",
  })

  return (
    <div className="content-container profile-content">
      <ProfileCard<formType, formErrType>
        user={user}
        setUser={setUser}
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
      />
      <FloatingButtonBar buttons={[
        { label: "Settings", onClick: () => navigate("/settings"), endIcon: <Settings /> },
      ]} />
    </div>
  )
}

export default Profile
