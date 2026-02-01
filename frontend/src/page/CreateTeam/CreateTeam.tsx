import React, { useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { TextField } from "@mui/material"
import moment, { Moment } from "moment"
import AppContext from "../../context"
import { useChampFlowForm } from "../../context/ChampFlowContext"
import { teamType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { inputLabel, updateForm, validateRequired, validateDateNotFuture, validateUniqueName } from "../../shared/formValidation"
import { createdByID } from "../../shared/utility"
import { getTeams } from "../../shared/requests/teamRequests"
import { createTeam, editTeam, removeTeam } from "../../shared/requests/teamRequests"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUICountrySelect, { countryType, findCountryByString } from "../../components/utility/muiCountrySelect/MUICountrySelect"
import MUIDatePicker from "../../components/utility/muiDatePicker/MUIDatePicker"
import DriverPicker from "../../components/utility/driverPicker/DriverPicker"
import { ArrowBack, Delete } from "@mui/icons-material"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import "./_createTeam.scss"

export interface createTeamFormType {
  _id: string | null
  teamName: string
  inceptionDate: Moment | null
  nationality: countryType | null
  drivers: driverType[]
  icon: File | string | null
  emblem: File | string | null
}

export interface createTeamFormErrType {
  teamName: string
  inceptionDate: string
  nationality: string
  drivers: string
  dropzone: string
  dropzoneEmblem: string
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

  // Track if drivers have been manually modified to prevent sync from overwriting user changes.
  const [ driversManuallyModified, setDriversManuallyModified ] = useState<boolean>(false)

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
        emblem: null,
      }
    }
    return {
      _id: null,
      teamName: "",
      inceptionDate: null,
      nationality: null,
      drivers: [],
      icon: null,
      emblem: null,
    }
  }

  const [ form, setForm ] = useState<createTeamFormType>(getInitialFormState)
  const [ formErr, setFormErr ] = useState<createTeamFormErrType>({
    teamName: "",
    inceptionDate: "",
    nationality: "",
    drivers: "",
    dropzone: "",
    dropzoneEmblem: "",
  })

  // Fetch all teams for duplicate checking.
  useEffect(() => {
    if (teams.length === 0 && !teamsReqSent) {
      getTeams(setTeams, user, setUser, navigate, setTeamsLoading, setBackendErr)
      setTeamsReqSent(true)
    }
  }, [teams, teamsReqSent, user, setUser, navigate])

  // Update form with complete team data from fetched list (handles incomplete data from navigation).
  useEffect(() => {
    // Skip if user has manually modified drivers to prevent overwriting their changes.
    if (driversManuallyModified) return
    if (teams.length > 0 && editingTeam?._id) {
      const completeTeam = teams.find(t => t._id === editingTeam._id)
      if (completeTeam && completeTeam.drivers.length > 0) {
        // Check if current form drivers are missing or have incomplete data (no icons).
        const hasIncompleteDrivers = form.drivers.length === 0 || form.drivers.some(d => !d.icon)
        if (hasIncompleteDrivers) {
          setForm(prev => ({ ...prev, drivers: completeTeam.drivers }))
        }
      }
    }
  }, [teams, editingTeam, form.drivers, driversManuallyModified])

  // Determine user's edit permissions.
  // Official teams can only be modified by admins.
  const canEdit = (): "delete" | "edit" | "" => {
    if (!editingTeam) return "edit"
    // Official check - only admins can modify.
    if (editingTeam.official && !user.permissions.admin) return ""
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
      !!form.emblem ||
      editingTeam.name !== form.teamName ||
      editingTeam.stats.nationality !== form.nationality?.label ||
      !moment(editingTeam.stats.inceptionDate).isSame(form.inceptionDate, "day") ||
      !driversMatch
    )
  }

  // Remove a driver from the form.
  const removeDriverHandler = (driver: driverType) => {
    setDriversManuallyModified(true)
    setForm(prev => ({ ...prev, drivers: prev.drivers.filter(d => d._id !== driver._id) }))
  }

  // Validate form fields.
  const validateForm = useCallback((): boolean => {
    // Reset form errors before validation.
    setFormErr({
      teamName: "",
      inceptionDate: "",
      nationality: "",
      drivers: "",
      dropzone: "",
      dropzoneEmblem: "",
    })

    let isValid = true

    // Check required text fields.
    const requiredFields: (keyof createTeamFormType)[] = [
      "teamName", "nationality", "inceptionDate"
    ]
    const requiredValid = validateRequired<createTeamFormType, createTeamFormErrType>(
      requiredFields, form, setFormErr
    )

    // Check inceptionDate is not in the future.
    const dateValid = validateDateNotFuture<createTeamFormErrType>(
      "inceptionDate", form.inceptionDate, setFormErr
    )

    // Emblem (team badge) is required when creating.
    if (!form.emblem && !isEditing) {
      setFormErr(prev => ({ ...prev, dropzoneEmblem: "Required." }))
      isValid = false
    }

    // Check for duplicate names.
    const nameValid = validateUniqueName<createTeamFormErrType>(
      "teamName", form.teamName, teams, form._id, setFormErr, "team"
    )

    return isValid && requiredValid && dateValid && nameValid
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
        icon: form.icon && typeof form.icon === "string" ? form.icon : editingTeam.icon,
        emblem: form.emblem && typeof form.emblem === "string" ? form.emblem : editingTeam.emblem,
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
    canRemove: false,
    onDelete: onDeleteHandler,
    canSubmit: true,
  }), [submitHandler, handleBack, isEditing, loading, delLoading, permissions, onDeleteHandler])

  // Register handlers with ChampFlowContext when embedded.
  const { showButtonBar } = useChampFlowForm(formHandlers, embedded)

  return (
  <>
    <div className="content-container create-team">
      <div className="create-team-top-bar">
        <h4>{isEditing ? "Edit" : "New"} Team</h4>
        {editingTeam?.official && <h4 className="official">Official</h4>}
      </div>
      <DropZone<createTeamFormType, createTeamFormErrType>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Team Emblem"
        thumbImg={editingTeam?.emblem || false}
        disabled={!permissions}
        profilePictureField="emblem"
        dropzoneErrorField="dropzoneEmblem"
      />
      <TextField
        name="teamName"
        inputProps={{ maxLength: 50 }}
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
          disabled={!permissions}
          onRemove={removeDriverHandler}
          emptyMessage="No Drivers!"
          isAdmin={user.permissions.admin}
          parentIsOfficial={editingTeam?.official}
        />
      )}
    </div>
    {showButtonBar && (
      <ButtonBar
        background
        position="relative"
        buttons={[
          { label: "Back", onClick: handleBack, startIcon: <ArrowBack />, color: "inherit" },
          ...(permissions === "delete" && isEditing ? [{
            label: "Delete",
            onClick: onDeleteHandler,
            startIcon: <Delete />,
            color: "error" as const,
            loading: delLoading
          }] : []),
          {
            label: isEditing ? "Update" : "Submit",
            onClick: isEditing ? onUpdateHandler : onSubmitHandler,
            disabled: !permissions || (isEditing && !hasFormChanged()),
            loading
          }
        ]}
      />
    )}
  </>
  )
}

export default CreateTeam
