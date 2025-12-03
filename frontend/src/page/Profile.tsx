import React, { useContext, useState } from "react"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import AppContext from "../context"
import ProfileCard from "../components/cards/profileCard/ProfileCard"
import { formErrType, formType } from "../shared/types"
import LogoutCard from "../components/cards/logoutCard/LogoutCard"
import UpdateEmailCard from "../components/cards/updateEmailCard/updateEmailCard"
import UpdateNameCard from "../components/cards/updateNameCard/updateNameCard"
import UpdatePPCard from "../components/cards/updatePPCard/UpdatePPCard"
import UpdatePassCard from "../components/cards/updatePassCard/UpdatePassCard"

const Profile: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ form, setForm ] = useState<formType>({
    icon: null,
    profile_picture: null,
    name: user.name,
    email: user.email,
  })
  const [ formErr, setFormErr ] = useState<formErrType>({
    name: "",
    email: "",
    dropzone: "",
  })

  return (
    <div className="content-container">
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
      <UpdateNameCard
        user={user}
        setUser={setUser}
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
      />
      <UpdateEmailCard
        user={user}
        setUser={setUser}
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
      />
      <UpdatePPCard/>
      <UpdatePassCard/>
      <div className="profile-bottom-cards">
        <LogoutCard setUser={setUser}/>
      </div>
    </div>
  )
}

export default Profile
