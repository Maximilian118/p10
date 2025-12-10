import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button, CircularProgress, TextField } from "@mui/material"
import moment, { Moment } from "moment"
import AppContext from "../../context"
import { teamType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { createdByID } from "../../shared/utility"
import { getTeams } from "../../shared/requests/teamRequests"
import { createTeam, editTeam, removeTeam } from "../../shared/requests/teamRequests"
import { getDrivers } from "../../shared/requests/driverRequests"
import { initDriver } from "../../shared/init"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUICountrySelect, { countryType, findCountryByString } from "../../components/utility/muiCountrySelect/MUICountrySelect"
import MUIDatePicker from "../../components/utility/muiDatePicker/MUIDatePicker"
import DriverPicker from "../../components/utility/driverPicker/DriverPicker"
import DriverEdit from "../../components/utility/driverPicker/driverEdit/DriverEdit"
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

const CreateTeam: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if we're editing an existing team.
  const editingTeam = (location.state as { team?: teamType })?.team
  const isEditing = !!editingTeam

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ , setTeamsLoading ] = useState<boolean>(false)
  const [ driversLoading, setDriversLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ teams, setTeams ] = useState<teamType[]>([])
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ driverValue, setDriverValue ] = useState<driverType | null>(null)
  const [ teamsReqSent, setTeamsReqSent ] = useState<boolean>(false)
  const [ driversReqSent, setDriversReqSent ] = useState<boolean>(false)

  // State for inline DriverEdit component.
  const [ isDriverEdit, setIsDriverEdit ] = useState<boolean>(false)
  const [ driverToEdit, setDriverToEdit ] = useState<driverType>(initDriver(user))

  const [ form, setForm ] = useState<createTeamFormType>({
    _id: editingTeam?._id || null,
    teamName: editingTeam?.name || "",
    inceptionDate: editingTeam?.stats.inceptionDate ? moment(editingTeam.stats.inceptionDate) : null,
    nationality: editingTeam?.stats.nationality ? findCountryByString(editingTeam.stats.nationality) : null,
    drivers: editingTeam?.drivers || [],
    icon: null,
    profile_picture: null,
  })
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

  // Fetch all drivers for driver picker.
  useEffect(() => {
    if (drivers.length === 0 && !driversReqSent) {
      getDrivers(setDrivers, user, setUser, navigate, setDriversLoading, setBackendErr)
      setDriversReqSent(true)
    }
  }, [drivers, driversReqSent, user, setUser, navigate])

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

  // Add a driver to the team.
  const addDriverHandler = (driver: driverType) => {
    setForm(prevForm => ({
      ...prevForm,
      drivers: [driver, ...prevForm.drivers],
    }))
    setDriverValue(null)
    setFormErr(prevErrs => ({ ...prevErrs, drivers: "" }))
  }

  // Remove a driver from the team.
  const removeDriverHandler = (driver: driverType) => {
    setForm(prevForm => ({
      ...prevForm,
      drivers: prevForm.drivers.filter(d => d._id !== driver._id),
    }))
  }

  // Open inline DriverEdit to create a new driver.
  const openNewDriverEdit = () => {
    setDriverToEdit(initDriver(user))
    setIsDriverEdit(true)
  }

  // Open inline DriverEdit to edit an existing driver.
  const openEditDriver = (driver: driverType) => {
    setDriverToEdit(driver)
    setIsDriverEdit(true)
  }

  // Validate form fields.
  const validateForm = (): boolean => {
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
  }

  // Handle form submission for create.
  const onSubmitHandler = async () => {
    if (!validateForm()) return

    const team = await createTeam(form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (team && team._id) {
      navigate("/teams", { state: { newTeamId: team._id } })
    }
  }

  // Handle form submission for update.
  const onUpdateHandler = async () => {
    if (!validateForm()) return
    if (!editingTeam) return

    const success = await editTeam(editingTeam, form, setForm, user, setUser, navigate, setLoading, setBackendErr)

    if (success) {
      navigate("/teams")
    }
  }

  // Handle delete.
  const onDeleteHandler = async () => {
    if (!editingTeam) return

    if (editingTeam.drivers.length > 0) {
      setFormErr(prev => ({ ...prev, teamName: "This team still has drivers." }))
      return
    }

    const success = await removeTeam(editingTeam, user, setUser, navigate, setDelLoading, setBackendErr)

    if (success) {
      navigate("/teams")
    }
  }

  const permissions = canEdit()

  // Render inline DriverEdit component when creating/editing a driver.
  if (isDriverEdit) {
    return (
      <div className="content-container">
        <DriverEdit<createTeamFormType>
          setIsDriverEdit={setIsDriverEdit}
          setForm={setForm}
          driver={driverToEdit}
          setDriver={setDriverToEdit}
          user={user}
          setUser={setUser}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          drivers={drivers}
        />
      </div>
    )
  }

  return (
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
      <DriverPicker
        drivers={drivers}
        selectedDrivers={form.drivers}
        value={driverValue}
        setValue={setDriverValue}
        loading={driversLoading}
        label={inputLabel("drivers", formErr, backendErr)}
        error={!!formErr.drivers || backendErr.type === "drivers"}
        disabled={!permissions}
        onAdd={addDriverHandler}
        onRemove={removeDriverHandler}
        onEdit={openEditDriver}
        onNew={openNewDriverEdit}
        onChange={() => setFormErr(prev => ({ ...prev, drivers: "" }))}
      />
      <div className="button-bar">
        <Button
          variant="contained"
          color="inherit"
          onClick={() => navigate("/teams")}
        >Back</Button>
        {permissions === "delete" && isEditing && (
          <Button
            variant="contained"
            color="error"
            onClick={onDeleteHandler}
            startIcon={delLoading && <CircularProgress size={20} color="inherit" />}
          >Delete</Button>
        )}
        <Button
          variant="contained"
          disabled={!permissions || (isEditing && !hasFormChanged())}
          onClick={isEditing ? onUpdateHandler : onSubmitHandler}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >{isEditing ? "Update" : "Submit"}</Button>
      </div>
    </div>
  )
}

export default CreateTeam
