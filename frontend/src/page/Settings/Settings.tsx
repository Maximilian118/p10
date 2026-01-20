import React, { useContext, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowBack, Logout, Save } from "@mui/icons-material"
import "./_settings.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import { logout } from "../../shared/localStorage"
import { formErrType, formType } from "../../shared/types"
import UpdateEmailCard from "../../components/cards/updateEmailCard/updateEmailCard"
import UpdateNameCard from "../../components/cards/updateNameCard/updateNameCard"
import UpdatePPCard from "../../components/cards/updatePPCard/UpdatePPCard"
import UpdatePassCard from "../../components/cards/updatePassCard/UpdatePassCard"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [loading, setLoading] = useState(false)
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

  // Check if form has changes compared to current user data.
  const hasChanges = form.name !== user.name || form.email !== user.email

  // Check if form has any validation errors.
  const hasErrors = Object.values(formErr).some(err => !!err)

  // Handle save button click.
  const handleSave = async () => {
    if (!hasChanges || hasErrors) return
    setLoading(true)
    // TODO: Implement save logic for name/email updates.
    setLoading(false)
  }

  return (
    <div className="content-container settings-content">
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
      <UpdatePPCard />
      <UpdatePassCard />
      <ButtonBar buttons={[
        { label: "Back", onClick: () => navigate("/profile"), startIcon: <ArrowBack />, color: "inherit" },
        { label: "Save", onClick: handleSave, startIcon: <Save />, disabled: !hasChanges || hasErrors, loading, color: "success" },
        { label: "Logout", onClick: () => logout(setUser, navigate), endIcon: <Logout />, color: "error" },
      ]} />
    </div>
  )
}

export default Settings
