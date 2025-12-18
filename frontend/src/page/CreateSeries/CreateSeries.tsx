import React, { useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { TextField } from "@mui/material"
import AppContext from "../../context"
import { useChampFlowForm } from "../../context/ChampFlowContext"
import { seriesType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { createSeries, editSeries, removeSeries } from "../../shared/requests/seriesRequests"
import { getDrivers } from "../../shared/requests/driverRequests"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { initDriver } from "../../shared/init"
import { createdByID } from "../../shared/utility"
import DropZone from "../../components/utility/dropZone/DropZone"
import DriverPicker from "../../components/utility/driverPicker/DriverPicker"
import CreateDriver from "../CreateDriver/CreateDriver"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import "./_createSeries.scss"

export interface createSeriesFormType {
  _id: string | null
  seriesName: string
  drivers: driverType[]
  icon: File | string | null
  profile_picture: File | string | null
}

export interface createSeriesFormErrType {
  seriesName: string
  drivers: string
  dropzone: string
  [key: string]: string
}

interface CreateSeriesProps {
  // Embedded mode flag - when true, uses callbacks instead of navigation.
  embedded?: boolean
  // Initial series data for editing (alternative to location.state).
  initialSeries?: seriesType | null
  // Callback when series is successfully created/updated.
  onSuccess?: (series: seriesType) => void
  // Callback for back button in embedded mode.
  onBack?: () => void
  // Parent series list setter for state lifting.
  setParentSeriesList?: React.Dispatch<React.SetStateAction<seriesType[]>>
}

// Component for creating or editing a series. Can be used standalone or embedded.
const CreateSeries: React.FC<CreateSeriesProps> = ({
  embedded = false,
  initialSeries = null,
  onSuccess,
  onBack: onBackProp,
  setParentSeriesList,
}) => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Determine the series to edit - from props (embedded) or location state (standalone).
  const locationSeries = (location.state as { series?: seriesType })?.series
  const editingSeries = embedded ? initialSeries : locationSeries
  const isEditing = !!editingSeries

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ driversLoading, setDriversLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ value, setValue ] = useState<driverType | null>(null)
  const [ reqSent, setReqSent ] = useState<boolean>(false)

  // State for inline CreateDriver component.
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
  const validateForm = useCallback((): boolean => {
    const errors: createSeriesFormErrType = {
      seriesName: "",
      drivers: "",
      dropzone: "",
    }

    // Series image is required when creating.
    if (!form.icon && !isEditing) {
      errors.dropzone = "Please enter a series image."
    }

    if (!form.seriesName) {
      errors.seriesName = "Please enter a series name."
    }

    if (form.drivers.length < 2) {
      errors.drivers = "At least 2 drivers are required."
    }

    setFormErr(errors)
    return !Object.values(errors).some(error => error !== "")
  }, [form.seriesName, form.drivers.length, form.icon, isEditing])

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

  // Open inline CreateDriver to create a new driver.
  const openNewDriverEdit = () => {
    setDriverToEdit(initDriver(user))
    setIsDriverEdit(true)
  }

  // Open inline CreateDriver to edit an existing driver.
  const openEditDriver = (driver: driverType) => {
    setDriverToEdit(driver)
    setIsDriverEdit(true)
  }

  // Handle form submission for create.
  const onSubmitHandler = useCallback(async () => {
    if (!validateForm()) return

    const series = await createSeries(
      form,
      setForm,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (series && series._id) {
      // Update parent series list if provided.
      if (setParentSeriesList) {
        setParentSeriesList(prev => [series, ...prev])
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(series)
      } else {
        navigate("/series", { state: { newSeriesId: series._id } })
      }
    }
  }, [form, user, setUser, navigate, setParentSeriesList, embedded, onSuccess, validateForm])

  // Handle form submission for update.
  const onUpdateHandler = useCallback(async () => {
    if (!validateForm()) return
    if (!editingSeries) return

    const success = await editSeries(
      editingSeries,
      form,
      setForm,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (success) {
      // Build updated series object for callback.
      const updatedSeries: seriesType = {
        ...editingSeries,
        name: form.seriesName,
        url: form.icon && typeof form.icon === "string" ? form.icon : editingSeries.url,
        drivers: form.drivers,
      }

      // Update parent series list if provided.
      if (setParentSeriesList) {
        setParentSeriesList(prev => prev.map(s => s._id === updatedSeries._id ? updatedSeries : s))
      }

      // Embedded mode: call success callback instead of navigating.
      if (embedded && onSuccess) {
        onSuccess(updatedSeries)
      } else {
        navigate("/series")
      }
    }
  }, [editingSeries, form, user, setUser, navigate, setParentSeriesList, embedded, onSuccess, validateForm])

  // Handle delete.
  const onDeleteHandler = useCallback(async () => {
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
      // Update parent series list if provided.
      if (setParentSeriesList) {
        setParentSeriesList(prev => prev.filter(s => s._id !== editingSeries._id))
      }

      // Embedded mode: call back callback instead of navigating.
      if (embedded && onBackProp) {
        onBackProp()
      } else {
        navigate("/series")
      }
    }
  }, [editingSeries, user, setUser, navigate, setParentSeriesList, embedded, onBackProp])

  // Handle back button click.
  const handleBack = useCallback(() => {
    if (embedded && onBackProp) {
      onBackProp()
    } else {
      navigate(-1)
    }
  }, [embedded, onBackProp, navigate])

  // Handle driver created/updated from embedded CreateDriver.
  const handleDriverSuccess = (driver: driverType) => {
    // Check if updating existing driver in form or adding new one.
    const existingIndex = form.drivers.findIndex(d => d._id === driver._id)
    if (existingIndex >= 0) {
      // Update existing driver in form.
      setForm(prev => ({
        ...prev,
        drivers: prev.drivers.map(d => d._id === driver._id ? driver : d)
      }))
    } else {
      // Add new driver to form.
      setForm(prev => ({ ...prev, drivers: [driver, ...prev.drivers] }))
    }
    setIsDriverEdit(false)
    setDriverToEdit(initDriver(user))
  }

  // Handle back from embedded CreateDriver.
  const handleDriverBack = () => {
    setIsDriverEdit(false)
    setDriverToEdit(initDriver(user))
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

  // Render inline CreateDriver component when creating/editing a driver.
  if (isDriverEdit) {
    return (
      <CreateDriver
        embedded
        initialDriver={driverToEdit._id ? driverToEdit : null}
        onSuccess={handleDriverSuccess}
        onBack={handleDriverBack}
        setParentDrivers={setDrivers}
      />
    )
  }

  return (
  <>
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
        inputProps={{ maxLength: 50 }}
        className="mui-form-el"
        label={inputLabel("seriesName", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<createSeriesFormType, createSeriesFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.seriesName}
        error={formErr.seriesName || backendErr.type === "seriesName" ? true : false}
        disabled={!permissions}
      />
      <DriverPicker
        drivers={drivers}
        selectedDrivers={form.drivers}
        value={value}
        setValue={setValue}
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
    </div>
    {showButtonBar && (
      <ButtonBar
        onBack={handleBack}
        onDelete={onDeleteHandler}
        onSubmit={isEditing ? onUpdateHandler : onSubmitHandler}
        showDelete={permissions === "delete" && isEditing}
        submitDisabled={!permissions || form.drivers.length < 2 || (isEditing && !hasFormChanged())}
        submitLabel={isEditing ? "Update" : "Submit"}
        loading={loading}
        delLoading={delLoading}
      />
    )}
  </>
  )
}

export default CreateSeries
