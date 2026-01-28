import React, { useContext, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowBack, Logout, Save, Image as ImageIcon, Lock as LockIcon, Email, Delete } from "@mui/icons-material"
import { Button } from "@mui/material"
import "./_settings.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import { logout } from "../../shared/localStorage"
import { formErrType, formType, SelectionModeState, NotificationSettingsType } from "../../shared/types"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import MUITextField from "../../components/utility/muiTextField/MUITextField"
import { inputLabel, updateForm } from "../../shared/formValidation"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import { updateUser, checkIsAdjudicator, deleteAccount } from "../../shared/requests/userRequests"
import { updateNotificationSettings } from "../../shared/requests/notificationRequests"
import Confirm from "../Confirm/Confirm"

// Toggle switch component for notification settings.
interface NotificationToggleProps {
  label: string
  active: boolean
  onChange: (value: boolean) => void
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ label, active, onChange }) => (
  <div className="settings-toggle-row">
    <p className="settings-toggle-row__label">{label}</p>
    <div
      className={`settings-toggle ${active ? "settings-toggle--active" : ""}`}
      onClick={() => onChange(!active)}
      role="switch"
      aria-checked={active}
    />
  </div>
)

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [loading, setLoading] = useState(false)
  const [showEmailChanged, setShowEmailChanged] = useState(false)
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
  const [selectionMode, setSelectionMode] = useState<SelectionModeState>({
    active: false,
    targetSlot: null,
  })
  const [featuredBadgeLoading] = useState(false)
  const dropzoneOpenRef = useRef<(() => void) | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAdjudicatorOfChamp, setIsAdjudicatorOfChamp] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Check if form has changes compared to current user data.
  const hasChanges =
    form.name !== user.name ||
    form.email !== user.email ||
    form.icon !== null ||
    form.profile_picture !== null

  // Check if form has any validation errors.
  const hasErrors = Object.values(formErr).some(err => !!err)

  // Handle save button click.
  const handleSave = async () => {
    if (!hasChanges || hasErrors) return

    const result = await updateUser(form, user, setUser, navigate, setLoading, setBackendErr)

    if (result.success) {
      // Reset form to reflect saved values.
      setForm(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
        icon: null,
        profile_picture: null,
      }))

      if (result.emailChanged) {
        setShowEmailChanged(true)
      }
    }
  }

  // Check if user is adjudicator before showing delete confirmation.
  const handleDeleteClick = async () => {
    const result = await checkIsAdjudicator(user, setBackendErr)
    setIsAdjudicatorOfChamp(result)
    setShowDeleteConfirm(true)
  }

  // Handle account deletion.
  const handleDeleteAccount = async () => {
    await deleteAccount(user, setUser, navigate, setDeleteLoading, setBackendErr)
  }

  // Handle notification setting toggle.
  const handleNotificationToggle = async (key: keyof NotificationSettingsType, value: boolean) => {
    await updateNotificationSettings({ [key]: value }, user, setUser, navigate, setBackendErr)
  }

  // Show email changed confirmation view.
  if (showEmailChanged) {
    return (
      <Confirm
        variant="success"
        icon={<Email />}
        heading="Verification Email Sent"
        paragraphs={[
          "We've sent a verification link to your new email address.",
          "Please check your inbox and click the link to confirm the change.",
          "The link will expire in 24 hours."
        ]}
        cancelText="Back to Settings"
        confirmText="Got it"
        onCancel={() => setShowEmailChanged(false)}
        onConfirm={() => setShowEmailChanged(false)}
      />
    )
  }

  // Show delete account confirmation view.
  if (showDeleteConfirm) {
    if (isAdjudicatorOfChamp) {
      // User is adjudicator - show blocking notice with single button.
      return (
        <Confirm
          variant="danger"
          icon={<Delete />}
          heading="Cannot Delete Account"
          paragraphs={[
            "You are currently the adjudicator of one or more championships.",
            "You must transfer adjudicator rights to another competitor before you can delete your account.",
            "Go to your championship settings and assign a new adjudicator first."
          ]}
          confirmText="Back to Settings"
          onConfirm={() => setShowDeleteConfirm(false)}
          singleButton
        />
      )
    }

    // Normal delete confirmation.
    return (
      <Confirm
        variant="danger"
        icon={<Delete />}
        heading="Delete Your Account?"
        paragraphs={[
          "This action is permanent and cannot be undone.",
          "Your profile, badges, and all personal data will be deleted.",
          "Your points will remain in championship history."
        ]}
        cancelText="Keep My Account"
        confirmText="Delete Forever"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />
    )
  }

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
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        featuredBadgeLoading={featuredBadgeLoading}
        dropzoneOpenRef={dropzoneOpenRef}
        disableBadgeSlots
      />
      <div className="settings-content">
        <MUITextField
          inputProps={{ maxLength: 30 }}
          className="mui-form-el"
          name="name"
          label={inputLabel("name", formErr, backendErr)}
          value={form.name ?? ""}
          onChange={e => updateForm<formType, formErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
          error={!!formErr.name || backendErr.type === "name"}
        />
        <MUITextField
          className="mui-form-el"
          name="email"
          label={inputLabel("email", formErr, backendErr)}
          value={form.email ?? ""}
          onChange={e => updateForm<formType, formErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
          error={!!formErr.email || backendErr.type === "email"}
        />
        <Button
          variant="contained"
          className="settings-action-btn"
          onClick={() => dropzoneOpenRef.current?.()}
          startIcon={<ImageIcon />}
          fullWidth
        >
          Change Profile Picture
        </Button>
        <Button
          variant="contained"
          className="settings-action-btn"
          onClick={() => navigate("/password")}
          startIcon={<LockIcon />}
          fullWidth
        >
          Change Password
        </Button>
        <Button
          variant="contained"
          className="settings-action-btn settings-action-btn--danger"
          onClick={handleDeleteClick}
          startIcon={<Delete />}
          fullWidth
        >
          Delete Account
        </Button>

        {/* Email Notification Settings */}
        <div className="settings-notifications">
          <h3 className="settings-notifications__title">Email Notifications</h3>

          <NotificationToggle
            label="Championship invites"
            active={user.notificationSettings?.emailChampInvite ?? true}
            onChange={(value) => handleNotificationToggle("emailChampInvite", value)}
          />
          <NotificationToggle
            label="Badge earned"
            active={user.notificationSettings?.emailBadgeEarned ?? true}
            onChange={(value) => handleNotificationToggle("emailBadgeEarned", value)}
          />
          <NotificationToggle
            label="Round started"
            active={user.notificationSettings?.emailRoundStarted ?? true}
            onChange={(value) => handleNotificationToggle("emailRoundStarted", value)}
          />
          <NotificationToggle
            label="Results posted"
            active={user.notificationSettings?.emailResultsPosted ?? true}
            onChange={(value) => handleNotificationToggle("emailResultsPosted", value)}
          />
          <NotificationToggle
            label="Kicked from championship"
            active={user.notificationSettings?.emailKicked ?? true}
            onChange={(value) => handleNotificationToggle("emailKicked", value)}
          />
          <NotificationToggle
            label="Banned from championship"
            active={user.notificationSettings?.emailBanned ?? true}
            onChange={(value) => handleNotificationToggle("emailBanned", value)}
          />
          <NotificationToggle
            label="Promoted to adjudicator"
            active={user.notificationSettings?.emailPromoted ?? true}
            onChange={(value) => handleNotificationToggle("emailPromoted", value)}
          />
        </div>
      </div>
      <ButtonBar buttons={[
        { label: "Back", onClick: () => navigate("/profile"), startIcon: <ArrowBack />, color: "inherit" },
        { label: "Save", onClick: handleSave, startIcon: <Save />, disabled: !hasChanges || hasErrors, loading, color: "success" },
        { label: "Logout", onClick: () => logout(setUser, navigate), endIcon: <Logout />, color: "error" },
      ]} />
    </div>
  )
}

export default Settings
