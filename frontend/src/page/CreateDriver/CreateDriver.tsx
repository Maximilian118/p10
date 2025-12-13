import React, { useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { InputAdornment, TextField } from "@mui/material"
import { Abc } from "@mui/icons-material"
import moment, { Moment } from "moment"
import AppContext from "../../context"
import { useChampFlowForm } from "../../context/ChampFlowContext"
import { driverType, teamType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { initTeam } from "../../shared/init"
import { createdByID, heightCMOptions, isThreeLettersUppercase, sortAlphabetically, weightKGOptions } from "../../shared/utility"
import { getDrivers } from "../../shared/requests/driverRequests"
import { getTeams } from "../../shared/requests/teamRequests"
import { createDriver, editDriver, removeDriver } from "../../shared/requests/driverRequests"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUICountrySelect, { countryType, findCountryByString } from "../../components/utility/muiCountrySelect/MUICountrySelect"
import MUIDatePicker from "../../components/utility/muiDatePicker/MUIDatePicker"
import MUIAutocomplete from "../../components/utility/muiAutocomplete/muiAutocomplete"
import MUICheckbox from "../../components/utility/muiCheckbox/MUICheckbox"
import TeamCard from "../../components/cards/teamCard/TeamCard"
import AddButton from "../../components/utility/button/addButton/AddButton"
import CreateTeam from "../CreateTeam/CreateTeam"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import "./_createDriver.scss"

export interface createDriverFormType {
  _id: string | null
  driverName: string
  driverID: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}` | ""
  teams: teamType[]
  nationality: countryType | null
  heightCM: string | null
  weightKG: string | null
  birthday: Moment | null
  moustache: boolean
  mullet: boolean
  icon: File | string | null
  profile_picture: File | string | null
  body: File | string | null
}

export interface createDriverFormErrType {
  driverName: string
  driverID: string
  teams: string
  nationality: string
  heightCM: string
  weightKG: string
  birthday: string
  dropzone: string
  dropzoneBody: string
  [key: string]: string
}

interface CreateDriverProps {
  // Embedded mode flag - when true, uses callbacks instead of navigation.
  embedded?: boolean
  // Initial driver data for editing (alternative to location.state).
  initialDriver?: driverType | null
  // Callback when driver is successfully created/updated.
  onSuccess?: (driver: driverType) => void
  // Callback for back button in embedded mode.
  onBack?: () => void
  // Parent drivers list setter for state lifting.
  setParentDrivers?: React.Dispatch<React.SetStateAction<driverType[]>>
}

// Component for creating or editing a driver. Can be used standalone or embedded.
const CreateDriver: React.FC<CreateDriverProps> = ({
  embedded = false,
  initialDriver = null,
  onSuccess,
  onBack: onBackProp,
  setParentDrivers,
}) => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Determine the driver to edit - from props (embedded) or location state (standalone).
  const locationDriver = (location.state as { driver?: driverType })?.driver
  const editingDriver = embedded ? initialDriver : locationDriver
  const isEditing = !!editingDriver

  // Check if we came from another form that expects us to return (e.g., CreateSeries).
  const returnTo = (location.state as { returnTo?: string })?.returnTo
  const seriesForm = (location.state as { seriesForm?: unknown })?.seriesForm

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ , setDriversLoading ] = useState<boolean>(false)
  const [ teamsLoading, setTeamsLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ teams, setTeams ] = useState<teamType[]>([])
  const [ teamValue, setTeamValue ] = useState<teamType | null>(null)
  const [ driversReqSent, setDriversReqSent ] = useState<boolean>(false)
  const [ teamsReqSent, setTeamsReqSent ] = useState<boolean>(false)

  // State for inline CreateTeam component.
  const [ isTeamEdit, setIsTeamEdit ] = useState<boolean>(false)
  const [ teamToEdit, setTeamToEdit ] = useState<teamType>(initTeam(user))

  // Initialize form state based on whether we're editing or creating.
  const getInitialFormState = (): createDriverFormType => {
    if (editingDriver) {
      return {
        _id: editingDriver._id || null,
        driverName: editingDriver.name || "",
        driverID: editingDriver.driverID || "",
        teams: editingDriver.teams || [],
        nationality: editingDriver.stats.nationality ? findCountryByString(editingDriver.stats.nationality) : null,
        heightCM: editingDriver.stats.heightCM ? `${editingDriver.stats.heightCM}cm` : null,
        weightKG: editingDriver.stats.weightKG ? `${editingDriver.stats.weightKG}kg` : null,
        birthday: editingDriver.stats.birthday ? moment(editingDriver.stats.birthday) : null,
        moustache: editingDriver.stats.moustache || false,
        mullet: editingDriver.stats.mullet || false,
        icon: null,
        profile_picture: null,
        body: null,
      }
    }
    return {
      _id: null,
      driverName: "",
      driverID: "",
      teams: [],
      nationality: null,
      heightCM: null,
      weightKG: null,
      birthday: null,
      moustache: false,
      mullet: false,
      icon: null,
      profile_picture: null,
      body: null,
    }
  }

  const [ form, setForm ] = useState<createDriverFormType>(getInitialFormState)
  const [ formErr, setFormErr ] = useState<createDriverFormErrType>({
    driverName: "",
    driverID: "",
    teams: "",
    nationality: "",
    heightCM: "",
    weightKG: "",
    birthday: "",
    dropzone: "",
    dropzoneBody: "",
  })

  // Fetch all drivers for duplicate checking.
  useEffect(() => {
    if (drivers.length === 0 && !driversReqSent) {
      getDrivers(setDrivers, user, setUser, navigate, setDriversLoading, setBackendErr)
      setDriversReqSent(true)
    }
  }, [drivers, driversReqSent, user, setUser, navigate])

  // Fetch all teams for team picker.
  useEffect(() => {
    if (teams.length === 0 && !teamsReqSent) {
      getTeams(setTeams, user, setUser, navigate, setTeamsLoading, setBackendErr)
      setTeamsReqSent(true)
    }
  }, [teams, teamsReqSent, user, setUser, navigate])

  // Determine user's edit permissions.
  const canEdit = (): "delete" | "edit" | "" => {
    if (!editingDriver) return "edit"
    const noTeams = editingDriver.teams.length === 0
    const creator = createdByID(editingDriver.created_by) === user._id
    const authority = user.permissions.adjudicator || creator
    if (user.permissions.admin) return "delete"
    if (authority && noTeams) return "delete"
    if (authority) return "edit"
    return ""
  }

  // Check if form has changed from original driver values.
  const hasFormChanged = (): boolean => {
    if (!editingDriver) return true

    const teamsMatch =
      editingDriver.teams.length === form.teams.length &&
      editingDriver.teams.every(t => form.teams.some(ft => ft._id === t._id))

    return (
      !!form.icon ||
      !!form.body ||
      editingDriver.name !== form.driverName ||
      editingDriver.driverID !== form.driverID ||
      !teamsMatch ||
      editingDriver.stats.nationality !== form.nationality?.label ||
      `${editingDriver.stats.heightCM}cm` !== form.heightCM ||
      `${editingDriver.stats.weightKG}kg` !== form.weightKG ||
      !moment(editingDriver.stats.birthday).isSame(form.birthday, "day") ||
      editingDriver.stats.moustache !== form.moustache ||
      editingDriver.stats.mullet !== form.mullet
    )
  }

  // Validate form fields.
  const validateForm = useCallback((): boolean => {
    const errors: createDriverFormErrType = {
      driverName: "",
      driverID: "",
      teams: "",
      nationality: "",
      heightCM: "",
      weightKG: "",
      birthday: "",
      dropzone: "",
      dropzoneBody: "",
    }

    if (!form.icon && !isEditing) {
      errors.dropzone = "Please enter a headshot image."
    }

    if (!form.driverName) {
      errors.driverName = "Please enter a name."
    }

    if (!form.driverID) {
      errors.driverID = "Please enter a driver ID."
    } else if (!isThreeLettersUppercase(form.driverID)) {
      errors.driverID = "Must be three uppercase letters."
    }

    if (!form.nationality) {
      errors.nationality = "Please enter a nationality."
    }

    if (!form.heightCM) {
      errors.heightCM = "Please enter a height."
    }

    if (!form.weightKG) {
      errors.weightKG = "Please enter a weight."
    }

    if (!form.birthday) {
      errors.birthday = "Please enter a date."
    } else if (moment(form.birthday).isAfter(moment())) {
      errors.birthday = "Date cannot be in the future."
    }

    // Check for duplicate names.
    const otherDrivers = drivers.filter(d => d._id !== form._id)
    for (const driver of otherDrivers) {
      if (driver.name.toLowerCase() === form.driverName.toLowerCase()) {
        errors.driverName = "A driver by that name already exists!"
        break
      }
    }

    setFormErr(errors)
    return !Object.values(errors).some(error => error !== "")
  }, [form, isEditing, drivers])

  // Add a team to the form.
  const addTeamHandler = (team: teamType) => {
    setForm(prev => ({ ...prev, teams: [team, ...prev.teams] }))
    setTeamValue(null)
    setFormErr(prev => ({ ...prev, teams: "" }))
  }

  // Remove a team from the form.
  const removeTeamHandler = (team: teamType) => {
    setForm(prev => ({ ...prev, teams: prev.teams.filter(t => t._id !== team._id) }))
  }

  // Open inline CreateTeam to create a new team.
  const openNewTeamEdit = () => {
    setTeamToEdit(initTeam(user))
    setIsTeamEdit(true)
  }

  // Open inline CreateTeam to edit an existing team.
  const openEditTeam = (team: teamType) => {
    setTeamToEdit(team)
    setIsTeamEdit(true)
  }

  // Handle form submission for create.
  const onSubmitHandler = useCallback(async () => {
    if (!validateForm()) return

    const driver = await createDriver(form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (driver && driver._id) {
      // Update parent drivers list if provided.
      if (setParentDrivers) {
        setParentDrivers(prev => [driver, ...prev])
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(driver)
      } else if (returnTo && seriesForm) {
        // If we came from another form, return there with the new driver.
        navigate(returnTo, { state: { seriesForm, newDriver: driver } })
      } else {
        navigate("/drivers", { state: { newDriverId: driver._id } })
      }
    }
  }, [form, user, setUser, navigate, setParentDrivers, embedded, onSuccess, returnTo, seriesForm, validateForm])

  // Handle form submission for update.
  const onUpdateHandler = useCallback(async () => {
    if (!validateForm()) return
    if (!editingDriver) return

    const success = await editDriver(editingDriver, form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (success) {
      // Build updated driver object for callback.
      const updatedDriver: driverType = {
        ...editingDriver,
        name: form.driverName,
        driverID: form.driverID,
        icon: form.icon && typeof form.icon === "string" ? form.icon : editingDriver.icon,
        body: form.body && typeof form.body === "string" ? form.body : editingDriver.body,
        teams: form.teams,
        stats: {
          ...editingDriver.stats,
          nationality: form.nationality?.label || "",
          heightCM: form.heightCM ? parseInt(form.heightCM) : 0,
          weightKG: form.weightKG ? parseInt(form.weightKG) : 0,
          birthday: form.birthday?.toISOString() || "",
          moustache: form.moustache,
          mullet: form.mullet,
        },
      }

      // Update parent drivers list if provided.
      if (setParentDrivers) {
        setParentDrivers(prev => prev.map(d => d._id === updatedDriver._id ? updatedDriver : d))
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(updatedDriver)
      } else {
        navigate("/drivers")
      }
    }
  }, [editingDriver, form, user, setUser, navigate, setParentDrivers, embedded, onSuccess, validateForm])

  // Handle delete.
  const onDeleteHandler = useCallback(async () => {
    if (!editingDriver) return

    if (editingDriver.teams.length > 0) {
      setFormErr(prev => ({ ...prev, driverName: "This driver still belongs to a team." }))
      return
    }

    const success = await removeDriver(editingDriver, user, setUser, navigate, setDelLoading, setBackendErr)

    if (success) {
      // Update parent drivers list if provided.
      if (setParentDrivers) {
        setParentDrivers(prev => prev.filter(d => d._id !== editingDriver._id))
      }

      // Embedded mode: call back callback instead of navigating.
      if (embedded && onBackProp) {
        onBackProp()
      } else {
        navigate("/drivers")
      }
    }
  }, [editingDriver, user, setUser, navigate, setParentDrivers, embedded, onBackProp])

  // Handle back button click.
  const handleBack = useCallback(() => {
    if (embedded && onBackProp) {
      onBackProp()
    } else if (returnTo && seriesForm) {
      navigate(returnTo, { state: { seriesForm } })
    } else {
      navigate("/drivers")
    }
  }, [embedded, onBackProp, returnTo, seriesForm, navigate])

  // Handle team created/updated from embedded CreateTeam.
  const handleTeamSuccess = (team: teamType) => {
    // Check if updating existing team in form or adding new one.
    const existingIndex = form.teams.findIndex(t => t._id === team._id)
    if (existingIndex >= 0) {
      // Update existing team in form.
      setForm(prev => ({
        ...prev,
        teams: prev.teams.map(t => t._id === team._id ? team : t)
      }))
    } else {
      // Add new team to form.
      setForm(prev => ({ ...prev, teams: [team, ...prev.teams] }))
    }
    setIsTeamEdit(false)
    setTeamToEdit(initTeam(user))
  }

  // Handle back from embedded CreateTeam.
  const handleTeamBack = () => {
    setIsTeamEdit(false)
    setTeamToEdit(initTeam(user))
  }

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

  // Render inline CreateTeam component when creating/editing a team.
  if (isTeamEdit) {
    return (
      <CreateTeam
        embedded
        initialTeam={teamToEdit._id ? teamToEdit : null}
        onSuccess={handleTeamSuccess}
        onBack={handleTeamBack}
        setParentTeams={setTeams}
      />
    )
  }

  return (
  <>
    <div className="content-container create-driver">
      <h4>{isEditing ? "Edit" : "New"} Driver</h4>
      <div className="create-driver-dropzones">
        <div className="create-driver-dropzone-container">
          <DropZone<createDriverFormType, createDriverFormErrType>
            form={form}
            setForm={setForm}
            formErr={formErr}
            setFormErr={setFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            purposeText="Driver Headshot"
            thumbImg={editingDriver?.icon || false}
            disabled={!permissions}
          />
        </div>
        <div className="create-driver-dropzone-container">
          <DropZone<createDriverFormType, createDriverFormErrType>
            form={form}
            setForm={setForm}
            formErr={formErr}
            setFormErr={setFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            purposeText="Driver Full Body"
            thumbImg={editingDriver?.body || false}
            disabled={!permissions}
            optional
            singleOutput
            profilePictureField="body"
            dropzoneErrorField="dropzoneBody"
          />
        </div>
      </div>
      <TextField
        name="driverName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("driverName", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<createDriverFormType, createDriverFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.driverName}
        error={formErr.driverName || backendErr.type === "driverName" ? true : false}
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
      <div className="create-driver-team-picker">
        <MUIAutocomplete
          label={inputLabel("teams", formErr, backendErr)}
          displayNew="always"
          customNewLabel="Team"
          onNewMouseDown={() => openNewTeamEdit()}
          options={teams.filter(t => !form.teams.some(ft => ft._id === t._id))}
          value={teamValue ? teamValue.name : null}
          loading={teamsLoading}
          error={formErr.teams || backendErr.type === "teams" ? true : false}
          setObjValue={(value) => setTeamValue(value)}
          onLiClick={(value) => addTeamHandler(value)}
          onChange={() => setFormErr(prev => ({ ...prev, teams: "" }))}
        />
        <div className="create-driver-team-list">
          {sortAlphabetically(form.teams).map((team: teamType, i: number) => (
            <TeamCard
              key={i}
              team={team}
              onRemove={() => removeTeamHandler(team)}
              canRemove={!!permissions}
              onClick={() => openEditTeam(team)}
            />
          ))}
        </div>
        <AddButton
          onClick={() => openNewTeamEdit()}
          absolute
        />
      </div>
      <div className="create-driver-stats">
        <MUIAutocomplete
          label={inputLabel("heightCM", formErr, backendErr)}
          options={heightCMOptions()}
          value={form.heightCM}
          error={formErr.heightCM || backendErr.type === "heightCM" ? true : false}
          disabled={!permissions}
          setValue={(value) => setForm(prev => ({ ...prev, heightCM: value as string }))}
          onChange={() => setFormErr(prev => ({ ...prev, heightCM: "" }))}
        />
        <MUIAutocomplete
          label={inputLabel("weightKG", formErr, backendErr)}
          options={weightKGOptions()}
          value={form.weightKG}
          error={formErr.weightKG || backendErr.type === "weightKG" ? true : false}
          disabled={!permissions}
          setValue={(value) => setForm(prev => ({ ...prev, weightKG: value as string }))}
          onChange={() => setFormErr(prev => ({ ...prev, weightKG: "" }))}
        />
      </div>
      <div className="create-driver-stats">
        <MUIDatePicker
          label={inputLabel("birthday", formErr, backendErr)}
          value={form.birthday as null}
          error={formErr.birthday || backendErr.type === "birthday" ? true : false}
          disabled={!permissions}
          onChange={(newValue: Moment | null) => {
            setForm(prev => ({ ...prev, birthday: newValue }))
            setFormErr(prev => ({ ...prev, birthday: "" }))
          }}
        />
        <TextField
          name="driverID"
          label={inputLabel("driverID", formErr, backendErr)}
          variant="filled"
          onChange={e => updateForm<createDriverFormType, createDriverFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
          value={form.driverID}
          error={formErr.driverID || backendErr.type === "driverID" ? true : false}
          disabled={!permissions}
          inputProps={{ maxLength: 3 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Abc />
              </InputAdornment>
            ),
          }}
        />
      </div>
      <div className="create-driver-checkboxes">
        <MUICheckbox
          text="Moustache"
          checked={form.moustache}
          disabled={!permissions}
          onClick={() => setForm(prev => ({ ...prev, moustache: !prev.moustache }))}
          textRight
        />
        <MUICheckbox
          text="Mullet"
          checked={form.mullet}
          disabled={!permissions}
          onClick={() => setForm(prev => ({ ...prev, mullet: !prev.mullet }))}
          textRight
        />
      </div>
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

export default CreateDriver
