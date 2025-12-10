import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button, CircularProgress, TextField } from "@mui/material"
import AppContext from "../../context"
import { driverGroupType, driverType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { createDriverGroup, editDriverGroup, removeDriverGroup } from "../../shared/requests/driverGroupRequests"
import { getDrivers } from "../../shared/requests/driverRequests"
import { inputLabel, updateForm } from "../../shared/formValidation"
import { initDriver } from "../../shared/init"
import { createdByID, sortAlphabetically } from "../../shared/utility"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUIAutocomplete from "../../components/utility/muiAutocomplete/muiAutocomplete"
import DriverCard from "../../components/cards/driverCard/DriverCard"
import AddButton from "../../components/utility/button/addButton/AddButton"
import "./_createDriverGroup.scss"

export interface createDriverGroupFormType {
  _id: string | null
  groupName: string
  drivers: driverType[]
  icon: File | null
  profile_picture: File | null
}

export interface createDriverGroupFormErrType {
  groupName: string
  drivers: string
  dropzone: string
  [key: string]: string
}

// Serializable version of the form for navigation state (no File objects).
export interface serializedDriverGroupFormType {
  _id: string | null
  groupName: string
  drivers: driverType[]
}

// Serialize form for navigation (exclude Files).
const serializeGroupForm = (form: createDriverGroupFormType): serializedDriverGroupFormType => ({
  _id: form._id,
  groupName: form.groupName,
  drivers: form.drivers,
})

const CreateDriverGroup: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()

  // Check if we're editing an existing driver group.
  const editingGroup = (location.state as { group?: driverGroupType })?.group
  const isEditing = !!editingGroup

  // Check if returning from CreateDriver with form state.
  const returnedForm = (location.state as { groupForm?: serializedDriverGroupFormType })?.groupForm
  const newDriver = (location.state as { newDriver?: driverType })?.newDriver

  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ driversLoading, setDriversLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ drivers, setDrivers ] = useState<driverType[]>([])
  const [ value, setValue ] = useState<driverType | null>(null)
  const [ reqSent, setReqSent ] = useState<boolean>(false)

  // Initialize form state - prioritize returned form, then editing group, then empty.
  const getInitialFormState = (): createDriverGroupFormType => {
    if (returnedForm) {
      // Returning from CreateDriver - restore form state and add new driver if present.
      const formDrivers = newDriver ? [newDriver, ...returnedForm.drivers] : returnedForm.drivers
      return {
        ...returnedForm,
        drivers: formDrivers,
        icon: null,
        profile_picture: null,
      }
    }
    if (editingGroup) {
      return {
        _id: editingGroup._id || null,
        groupName: editingGroup.name || "",
        drivers: editingGroup.drivers || [],
        icon: null,
        profile_picture: null,
      }
    }
    return {
      _id: null,
      groupName: "",
      drivers: [],
      icon: null,
      profile_picture: null,
    }
  }

  const [ form, setForm ] = useState<createDriverGroupFormType>(getInitialFormState)
  const [ formErr, setFormErr ] = useState<createDriverGroupFormErrType>({
    groupName: "",
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
    if (!editingGroup) return "edit"
    const noChampionships = (editingGroup.championships?.length || 0) === 0
    const creator = createdByID(editingGroup.created_by) === user._id
    const authority = user.permissions.adjudicator || creator
    if (user.permissions.admin) return "delete"
    if (authority && noChampionships) return "delete"
    if (authority) return "edit"
    return ""
  }

  // Validate form fields.
  const validateForm = (): boolean => {
    const errors: createDriverGroupFormErrType = {
      groupName: "",
      drivers: "",
      dropzone: "",
    }

    if (!form.groupName) {
      errors.groupName = "Please enter a group name."
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

  // Handle form submission for create.
  const onSubmitHandler = async () => {
    if (!validateForm()) return

    const driverGroup = await createDriverGroup(
      form,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (driverGroup && driverGroup._id) {
      navigate("/driver-groups", { state: { newGroupId: driverGroup._id } })
    }
  }

  // Handle form submission for update.
  const onUpdateHandler = async () => {
    if (!validateForm()) return
    if (!editingGroup) return

    const success = await editDriverGroup(
      editingGroup,
      form,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    if (success) {
      navigate("/driver-groups")
    }
  }

  // Handle delete.
  const onDeleteHandler = async () => {
    if (!editingGroup) return

    if ((editingGroup.championships?.length || 0) > 0) {
      setFormErr(prev => ({ ...prev, groupName: "This group is still used in a championship." }))
      return
    }

    const success = await removeDriverGroup(
      editingGroup,
      user,
      setUser,
      navigate,
      setDelLoading,
      setBackendErr,
    )

    if (success) {
      navigate("/driver-groups")
    }
  }

  const permissions = canEdit()

  return (
    <div className="content-container create-driver-group">
      <h4>{isEditing ? "Edit" : "New"} Driver Group</h4>
      <DropZone<createDriverGroupFormType, createDriverGroupFormErrType>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Group Image"
        thumbImg={editingGroup?.url || false}
        disabled={!permissions}
      />
      <TextField
        name="groupName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("groupName", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<createDriverGroupFormType, createDriverGroupFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.groupName}
        error={formErr.groupName || backendErr.type === "groupName" ? true : false}
        disabled={!permissions}
      />
      <div className="driver-picker">
        <MUIAutocomplete
          label={inputLabel("drivers", formErr, backendErr)}
          displayNew="always"
          customNewLabel="Driver"
          onNewMouseDown={() => navigate("/create-driver", { state: { returnTo: "/create-driver-group", groupForm: serializeGroupForm(form) } })}
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
              onClick={() => navigate("/create-driver", { state: { driver, returnTo: "/create-driver-group", groupForm: serializeGroupForm(form) } })}
            />
          ))}
        </div>
        <AddButton
          onClick={() => navigate("/create-driver", { state: { returnTo: "/create-driver-group", groupForm: serializeGroupForm(form) } })}
          absolute
        />
      </div>
      <div className="button-bar">
        <Button
          variant="contained"
          color="inherit"
          onClick={() => navigate("/driver-groups")}
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
          disabled={!permissions || form.drivers.length < 2}
          onClick={isEditing ? onUpdateHandler : onSubmitHandler}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >{isEditing ? "Update" : "Submit"}</Button>
      </div>
    </div>
  )
}

export default CreateDriverGroup
