import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button, CircularProgress, TextField } from "@mui/material"
import AppContext from "../../context"
import { seriesType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { createSeries, editSeries, removeSeries } from "../../shared/requests/seriesRequests"
import { getDrivers } from "../../shared/requests/driverRequests"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { initDriver } from "../../shared/init"
import { createdByID, sortAlphabetically } from "../../shared/utility"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUIAutocomplete from "../../components/utility/muiAutocomplete/muiAutocomplete"
import DriverCard from "../../components/cards/driverCard/DriverCard"
import AddButton from "../../components/utility/button/addButton/AddButton"
import DriverEdit from "../../components/utility/driverPicker/driverEdit/DriverEdit"
import "./_createSeries.scss"

export interface createSeriesFormType {
  _id: string | null
  seriesName: string
  drivers: driverType[]
  icon: File | null
  profile_picture: File | null
}

export interface createSeriesFormErrType {
  seriesName: string
  drivers: string
  dropzone: string
  [key: string]: string
}

// Page for creating or editing a series.
const CreateSeries: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if we're editing an existing series.
  const editingSeries = (location.state as { series?: seriesType })?.series
  const isEditing = !!editingSeries

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ driversLoading, setDriversLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ value, setValue ] = useState<driverType | null>(null)
  const [ reqSent, setReqSent ] = useState<boolean>(false)

  // State for inline DriverEdit component.
  const [ isDriverEdit, setIsDriverEdit ] = useState<boolean>(false)
  const [ driverToEdit, setDriverToEdit ] = useState<driverType>(initDriver(user))

  // Initialize form state based on whether we're editing or creating.
  const getInitialFormState = (): createSeriesFormType => {
    if (editingSeries) {
      return {
        _id: editingSeries._id || null,
        seriesName: editingSeries.name || "",
        drivers: editingSeries.drivers || [],
        icon: null,
        profile_picture: null,
      }
    }
    return {
      _id: null,
      seriesName: "",
      drivers: [],
      icon: null,
      profile_picture: null,
    }
  }

  const [ form, setForm ] = useState<createSeriesFormType>(getInitialFormState)
  const [ formErr, setFormErr ] = useState<createSeriesFormErrType>({
    seriesName: "",
    drivers: "",
    dropzone: "",
  })

  // Fetch all drivers on mount.
  useEffect(() => {
    if (drivers.length === 0 && !reqSent) {
      getDrivers(setDrivers, user, setUser, navigate, setDriversLoading, setBackendErr)
      setReqSent(true)
    }
  }, [drivers, reqSent, user, setUser, navigate])

  // Determine user's edit permissions.
  const canEdit = (): "delete" | "edit" | "" => {
    if (!editingSeries) return "edit"
    const noChampionships = (editingSeries.championships?.length || 0) === 0
    const creator = createdByID(editingSeries.created_by) === user._id
    const authority = user.permissions.adjudicator || creator
    if (user.permissions.admin) return "delete"
    if (authority && noChampionships) return "delete"
    if (authority) return "edit"
    return ""
  }

  // Check if form has changed from original series values.
  const hasFormChanged = (): boolean => {
    if (!editingSeries) return true

    const driversMatch =
      editingSeries.drivers.length === form.drivers.length &&
      editingSeries.drivers.every(d => form.drivers.some(fd => fd._id === d._id))

    return (
      !!form.icon ||
      editingSeries.name !== form.seriesName ||
      !driversMatch
    )
  }

  // Validate form fields.
  const validateForm = (): boolean => {
    const errors: createSeriesFormErrType = {
      seriesName: "",
      drivers: "",
      dropzone: "",
    }

    if (!form.seriesName) {
      errors.seriesName = "Please enter a series name."
    }

    if (form.drivers.length < 2) {
      errors.drivers = "At least 2 drivers are required."
    }

    setFormErr(errors)
    return !Object.values(errors).some(error => error !== "")
  }

  // Add a driver to the form.
  const addDriverHandler = (driver: driverType) => {
    setForm(prevForm => ({
      ...prevForm,
      drivers: [driver, ...prevForm.drivers],
    }))
    setValue(null)
    setFormErr(prevErrs => ({ ...prevErrs, drivers: "" }))
  }

  // Remove a driver from the form.
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

  // Handle form submission for create.
  const onSubmitHandler = async () => {
    if (!validateForm()) return

    const series = await createSeries(
      form,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (series && series._id) {
      navigate("/series", { state: { newSeriesId: series._id } })
    }
  }

  // Handle form submission for update.
  const onUpdateHandler = async () => {
    if (!validateForm()) return
    if (!editingSeries) return

    const success = await editSeries(
      editingSeries,
      form,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (success) {
      navigate("/series")
    }
  }

  // Handle delete.
  const onDeleteHandler = async () => {
    if (!editingSeries) return

    if ((editingSeries.championships?.length || 0) > 0) {
      setFormErr(prev => ({ ...prev, seriesName: "This series is still used in a championship." }))
      return
    }

    const success = await removeSeries(
      editingSeries,
      user,
      setUser,
      navigate,
      setDelLoading,
      setBackendErr,
    )

    if (success) {
      navigate("/series")
    }
  }

  const permissions = canEdit()

  // Render inline DriverEdit component when creating/editing a driver.
  if (isDriverEdit) {
    return (
      <div className="content-container">
        <DriverEdit<createSeriesFormType>
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
    <div className="content-container create-series">
      <h4>{isEditing ? "Edit" : "New"} Series</h4>
      <DropZone<createSeriesFormType, createSeriesFormErrType>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Series Image"
        thumbImg={editingSeries?.url || false}
        disabled={!permissions}
      />
      <TextField
        name="seriesName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("seriesName", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<createSeriesFormType, createSeriesFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.seriesName}
        error={formErr.seriesName || backendErr.type === "seriesName" ? true : false}
        disabled={!permissions}
      />
      <div className="driver-picker">
        <MUIAutocomplete
          label={inputLabel("drivers", formErr, backendErr)}
          displayNew="always"
          customNewLabel="Driver"
          onNewMouseDown={() => openNewDriverEdit()}
          options={drivers.filter(d => !form.drivers.some(fd => fd._id === d._id))}
          value={value ? value.name : null}
          loading={driversLoading}
          error={formErr.drivers || backendErr.type === "drivers" ? true : false}
          setObjValue={(value) => setValue(value)}
          onLiClick={(value) => addDriverHandler(value)}
          onChange={() => setFormErr(prevErrs => ({ ...prevErrs, drivers: "" }))}
        />
        <div className="driver-picker-list">
          {sortAlphabetically(form.drivers).map((driver: driverType, i: number) => (
            <DriverCard
              key={i}
              driver={driver}
              onRemove={(driver) => removeDriverHandler(driver)}
              canRemove={!!permissions}
              onClick={() => openEditDriver(driver)}
            />
          ))}
        </div>
        <AddButton
          onClick={() => openNewDriverEdit()}
          absolute
        />
      </div>
      <div className="button-bar">
        <Button
          variant="contained"
          color="inherit"
          onClick={() => navigate("/series")}
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
          disabled={!permissions || form.drivers.length < 2 || (isEditing && !hasFormChanged())}
          onClick={isEditing ? onUpdateHandler : onSubmitHandler}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >{isEditing ? "Update" : "Submit"}</Button>
      </div>
    </div>
  )
}

export default CreateSeries
