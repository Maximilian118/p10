import React, { useContext, useState } from "react"
import './_email.scss'
import MUISwitch from "../../components/utility/muiSwitch/MUISwitch"
import { updateNotificationSettings } from "../../shared/requests/notificationRequests"
import { useNavigate } from "react-router-dom"
import AppContext from "../../context"
import { NotificationSettingsType } from "../../shared/localStorage"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import { ArrowBack } from "@mui/icons-material"

const Email: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ backendErr, setBackendErr]  = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()

  // Handle notification setting toggle.
  const handleEmailSettingsChange = async (key: keyof NotificationSettingsType, value: boolean) => {
    await updateNotificationSettings({ [key]: value }, user, setUser, navigate, setBackendErr)
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  return (
    <div className="content-container email-settings">
      <div className="form-title-logged-in">
        <h2>Email Preferences</h2>
      </div>
      <h3 className="section-title">General</h3>
      <div className="switches">
        <MUISwitch
          text="Championship invites"
          fullWidth
          checked={user.notificationSettings?.emailChampInvite ?? true}
          onChange={(value) => handleEmailSettingsChange("emailChampInvite", value)}
        />
        <MUISwitch
          text="League invites"
          fullWidth
          checked={user.notificationSettings?.emailLeagueInvite ?? true}
          onChange={(value) => handleEmailSettingsChange("emailLeagueInvite", value)}
        />
        <MUISwitch
          text="Badge earned"
          fullWidth
          checked={user.notificationSettings?.emailBadgeEarned ?? true}
          onChange={(value) => handleEmailSettingsChange("emailBadgeEarned", value)}
        />
        <MUISwitch
          text="Round started"
          fullWidth
          checked={user.notificationSettings?.emailRoundStarted ?? true}
          onChange={(value) => handleEmailSettingsChange("emailRoundStarted", value)}
        />
        <MUISwitch
          text="Results posted"
          fullWidth
          checked={user.notificationSettings?.emailResultsPosted ?? true}
          onChange={(value) => handleEmailSettingsChange("emailResultsPosted", value)}
        />
        <MUISwitch
          text="Kicked from championship"
          fullWidth
          checked={user.notificationSettings?.emailKicked ?? true}
          onChange={(value) => handleEmailSettingsChange("emailKicked", value)}
        />
        <MUISwitch
          text="Banned from championship"
          fullWidth
          checked={user.notificationSettings?.emailBanned ?? true}
          onChange={(value) => handleEmailSettingsChange("emailBanned", value)}
        />
        <MUISwitch
          text="Promoted to adjudicator"
          fullWidth
          checked={user.notificationSettings?.emailPromoted ?? true}
          onChange={(value) => handleEmailSettingsChange("emailPromoted", value)}
        />
        <MUISwitch
          text="User joined championship"
          fullWidth
          checked={user.notificationSettings?.emailUserJoined ?? true}
          onChange={(value) => handleEmailSettingsChange("emailUserJoined", value)}
        />
        <MUISwitch
          text="Round missed"
          fullWidth
          checked={user.notificationSettings?.emailRoundMissed ?? true}
          onChange={(value) => handleEmailSettingsChange("emailRoundMissed", value)}
        />
      </div>
      <h3 className="section-title">Protests</h3>
      <div className="switches">
        <MUISwitch
          text="Protest filed"
          fullWidth
          checked={user.notificationSettings?.emailProtestFiled ?? true}
          onChange={(value) => handleEmailSettingsChange("emailProtestFiled", value)}
        />
        <MUISwitch
          text="Protest vote required"
          fullWidth
          checked={user.notificationSettings?.emailProtestVoteRequired ?? true}
          onChange={(value) => handleEmailSettingsChange("emailProtestVoteRequired", value)}
        />
        <MUISwitch
          text="Protest passed"
          fullWidth
          checked={user.notificationSettings?.emailProtestPassed ?? true}
          onChange={(value) => handleEmailSettingsChange("emailProtestPassed", value)}
        />
        <MUISwitch
          text="Protest denied"
          fullWidth
          checked={user.notificationSettings?.emailProtestDenied ?? true}
          onChange={(value) => handleEmailSettingsChange("emailProtestDenied", value)}
        />
        <MUISwitch
          text="Protest expired"
          fullWidth
          checked={user.notificationSettings?.emailProtestExpired ?? true}
          onChange={(value) => handleEmailSettingsChange("emailProtestExpired", value)}
        />
      </div>
      <ButtonBar leftButtons={[
        { label: "Back", onClick: () => navigate("/settings"), startIcon: <ArrowBack />, color: "inherit" },
      ]} />
    </div>
  )
}

export default Email
