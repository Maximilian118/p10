import React, { useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { TextField } from "@mui/material"
import moment, { Moment } from "moment"
import AppContext from "../../context"
import { useChampFlowForm } from "../../context/ChampFlowContext"
import { teamType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { createdByID } from "../../shared/utility"
import { getTeams } from "../../shared/requests/teamRequests"
import { createTeam, editTeam, removeTeam } from "../../shared/requests/teamRequests"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUICountrySelect, { countryType, findCountryByString } from "../../components/utility/muiCountrySelect/MUICountrySelect"
import MUIDatePicker from "../../components/utility/muiDatePicker/MUIDatePicker"
import DriverPicker from "../../components/utility/driverPicker/DriverPicker"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import "./_createTeam.scss"

export interface createTeamFormType {
  _id: string | null
  teamName: string
  inceptionDate: Moment | null
  nationality: countryType | null
  drivers: driverType[]
  icon: File | string | null
  profile_picture: File | string | null
}

export interface createTeamFormErrType {
  teamName: string
  inceptionDate: string
  nationality: string
  drivers: string
  dropzone: string
  [key: string]: string
}

interface CreateTeamProps {
  // Embedded mode flag - when true, uses callbacks instead of navigation.
  embedded?: boolean
  // Initial team data for editing (alternative to location.state).
  initialTeam?: teamType | null
  // Callback when team is successfully created/updated.
  onSuccess?: (team: teamType) => void
  // Callback for back button in embedded mode.
  onBack?: () => void
  // Parent teams list setter for state lifting.
  setParentTeams?: React.Dispatch<React.SetStateAction<teamType[]>>
}

// Component for creating or editing a team. Can be used standalone or embedded.
const CreateTeam: React.FC<CreateTeamProps> = ({
  embedded = false,
  initialTeam = null,
  onSuccess,
  onBack: onBackProp,
  setParentTeams,
}) => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Determine the team to edit - from props (embedded) or location state (standalone).
  const locationTeam = (location.state as { team?: teamType })?.team
  const editingTeam = embedded ? initialTeam : locationTeam
  const isEditing = !!editingTeam

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ , setTeamsLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ teams, setTeams ] = useState<teamType[]>([])
  const [ teamsReqSent, setTeamsReqSent ] = useState<boolean>(false)

  // Initialize form state based on whether we're editing or creating.
  const getInitialFormState = (): createTeamFormType => {
    if (editingTeam) {
      return {
        _id: editingTeam._id || null,
        teamName: editingTeam.name || "",
        inceptionDate: editingTeam.stats.inceptionDate ? moment(editingTeam.stats.inceptionDate) : null,
        nationality: editingTeam.stats.nationality ? findCountryByString(editingTeam.stats.nationality) : null,
        drivers: editingTeam.drivers || [],
        icon: null,
        profile_picture: null,
      }
    }
    return {
      _id: null,
      teamName: "",
      inceptionDate: null,
      nationality: null,
      drivers: [],
      icon: null,
      profile_picture: null,
    }
  }

  const [ form, setForm ] = useState<createTeamFormType>(getInitialFormState)
  const [ formErr, setFormErr ] = useState<createTeamFormErrType>({
    teamName: "",
    inceptionDate: "",
    nationality: "",
    drivers: "",
    dropzone: "",
  })

  // Fetch all teams for duplicate checking.
  useEffect(() => {
    if (teams.length === 0 && !teamsReqSent) {
      getTeams(setTeams, user, setUser, navigate, setTeamsLoading, setBackendErr)
      setTeamsReqSent(true)
    }
  }, [teams, teamsReqSent, user, setUser, navigate])

  // Determine user's edit permissions.
  const canEdit = (): "delete" | "edit" | "" => {
    if (!editingTeam) return "edit"
    const noDrivers = editingTeam.drivers.length === 0
    const creator = createdByID(editingTeam.created_by) === user._id
    const authority = user.permissions.adjudicator || creator
    if (user.permissions.admin) return "delete"
    if (authority && noDrivers) return "delete"
    if (authority) return "edit"
    return ""
  }

  // Check if form has changed from original team values.
  const hasFormChanged = (): boolean => {
    if (!editingTeam) return true

    // Check if drivers array has changed.
    const driversMatch =
      editingTeam.drivers.length === form.drivers.length &&
      editingTeam.drivers.every(d => form.drivers.some(fd => fd._id === d._id))

    return (
      !!form.icon ||
      editingTeam.name !== form.teamName ||
      editingTeam.stats.nationality !== form.nationality?.label ||
      !moment(editingTeam.stats.inceptionDate).isSame(form.inceptionDate, "day") ||
      !driversMatch
    )
  }

  // Validate form fields.
  const validateForm = useCallback((): boolean => {
    const errors: createTeamFormErrType = {
      teamName: "",
      inceptionDate: "",
      nationality: "",
      drivers: "",
      dropzone: "",
    }

    if (!form.teamName) {
      errors.teamName = "Please enter a name."
    }

    if (!form.nationality) {
      errors.nationality = "Please enter a nationality."
    }

    if (!form.inceptionDate) {
      errors.inceptionDate = "Please enter a date."
    } else if (moment(form.inceptionDate).isAfter(moment())) {
      errors.inceptionDate = "Date cannot be in the future."
    }

    if (!form.icon && !isEditing) {
      errors.dropzone = "Please enter an image."
    }

    // Check for duplicate names.
    const otherTeams = teams.filter(t => t._id !== form._id)
    for (const team of otherTeams) {
      if (team.name.toLowerCase() === form.teamName.toLowerCase()) {
        errors.teamName = "A team by that name already exists!"
        break
      }
    }

    setFormErr(errors)
    return !Object.values(errors).some(error => error !== "")
  }, [form, isEditing, teams])

  // Handle form submission for create.
  const onSubmitHandler = useCallback(async () => {
    if (!validateForm()) return

    const team = await createTeam(form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (team && team._id) {
      // Update parent teams list if provided.
      if (setParentTeams) {
        setParentTeams(prev => [team, ...prev])
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(team)
      } else {
        navigate("/teams", { state: { newTeamId: team._id } })
      }
    }
  }, [form, user, setUser, navigate, setParentTeams, embedded, onSuccess, validateForm])

  // Handle form submission for update.
  const onUpdateHandler = useCallback(async () => {
    if (!validateForm()) return
    if (!editingTeam) return

    const success = await editTeam(editingTeam, form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (success) {
      // Build updated team object for callback.
      const updatedTeam: teamType = {
        ...editingTeam,
        name: form.teamName,
        url: form.icon && typeof form.icon === "string" ? form.icon : editingTeam.url,
        stats: {
          ...editingTeam.stats,
          nationality: form.nationality?.label || "",
          inceptionDate: form.inceptionDate?.toISOString() || "",
        },
        drivers: form.drivers,
      }

      // Update parent teams list if provided.
      if (setParentTeams) {
        setParentTeams(prev => prev.map(t => t._id === updatedTeam._id ? updatedTeam : t))
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(updatedTeam)
      } else {
        navigate("/teams")
      }
    }
  }, [editingTeam, form, user, setUser, navigate, setParentTeams, embedded, onSuccess, validateForm])

  // Handle delete.
  const onDeleteHandler = useCallback(async () => {
    if (!editingTeam) return

    if (editingTeam.drivers.length > 0) {
      setFormErr(prev => ({ ...prev, teamName: "This team still has drivers." }))
      return
    }

    const success = await removeTeam(editingTeam, user, setUser, navigate, setDelLoading, setBackendErr)

    if (success) {
      // Update parent teams list if provided.
      if (setParentTeams) {
        setParentTeams(prev => prev.filter(t => t._id !== editingTeam._id))
      }

      // Embedded mode: call back callback instead of navigating.
      if (embedded && onBackProp) {
        onBackProp()
      } else {
        navigate("/teams")
      }
    }
  }, [editingTeam, user, setUser, navigate, setParentTeams, embedded, onBackProp])

  // Handle back button click.
  const handleBack = useCallback(() => {
    if (embedded && onBackProp) {
      onBackProp()
    } else {
      navigate(-1)
    }
  }, [embedded, onBackProp, navigate])

  const permissions = canEdit()

  // Stable submit handler for ChampFlowContext registration.
  const submitHandler = useCallback(async () => {
    if (isEditing) await onUpdateHandler()
    else await onSubmitHandler()
  }, [isEditing, onUpdateHandler, onSubmitHandler])

  // Memoized form handlers for ChampFlowContext.
  const formHandlers = useMemo(() => ({
    submit: submitHandler,
    back: handleBack,
    isEditing,
    loading,
    delLoading,
    canDelete: permissions === "delete",
    onDelete: onDeleteHandler,
  }), [submitHandler, handleBack, isEditing, loading, delLoading, permissions, onDeleteHandler])

  // Register handlers with ChampFlowContext when embedded.
  const { showButtonBar } = useChampFlowForm(formHandlers, embedded)

  return (
  <>
    <div className="content-container create-team">
      <h4>{isEditing ? "Edit" : "New"} Team</h4>
      <DropZone<createTeamFormType, createTeamFormErrType>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Team Logo"
        thumbImg={editingTeam?.url || false}
        disabled={!permissions}
      />
      <TextField
        name="teamName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("teamName", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<createTeamFormType, createTeamFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.teamName}
        error={formErr.teamName || backendErr.type === "teamName" ? true : false}
        disabled={!permissions}
      />
      <MUICountrySelect
        label={inputLabel("nationality", formErr, backendErr)}
        value={form.nationality}
        error={formErr.nationality || backendErr.type === "nationality" ? true : false}
        disabled={!permissions}
        onChange={(e, val) => {
          setForm(prev => ({ ...prev, nationality: val }))
          setFormErr(prev => ({ ...prev, nationality: "" }))
        }}
      />
      <MUIDatePicker
        label={inputLabel("inceptionDate", formErr, backendErr)}
        value={form.inceptionDate as null}
        error={formErr.inceptionDate || backendErr.type === "inceptionDate" ? true : false}
        disabled={!permissions}
        className="mui-form-el"
        onChange={(newValue: Moment | null) => {
          setForm(prev => ({ ...prev, inceptionDate: newValue }))
          setFormErr(prev => ({ ...prev, inceptionDate: "" }))
        }}
      />
      {isEditing && (
        <DriverPicker
          drivers={[]}
          selectedDrivers={form.drivers}
          value={null}
          setValue={() => {}}
          label="Drivers"
          readOnly
          emptyMessage="No Drivers!"
        />
      )}
    </div>
    {showButtonBar && (
      <ButtonBar
        onBack={handleBack}
        onDelete={onDeleteHandler}
        onSubmit={isEditing ? onUpdateHandler : onSubmitHandler}
        showDelete={permissions === "delete" && isEditing}
        submitDisabled={!permissions || (isEditing && !hasFormChanged())}
        submitLabel={isEditing ? "Update" : "Submit"}
        loading={loading}
        delLoading={delLoading}
      />
    )}
  </>
  )
}

export default CreateTeam
