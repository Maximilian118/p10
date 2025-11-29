import React, { useState } from "react"
import './_driverGroupEdit.scss'
import { driverGroupType, driverType } from "../../../../shared/types"
import DropZone from "../../dropZone/DropZone"
import { Button, CircularProgress, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import DriverEdit from '../../driverPicker/driverEdit/DriverEdit'
import { userType } from "../../../../shared/localStorage"
import DriverPicker from "../../driverPicker/DriverPicker"
import { initDriver, initDriverGroup } from "../../../../shared/init"
import { deleteDriverGroup, newDriverGroup, updateDriverGroup } from "../../../../shared/requests/driverGroupRequests"
import { useNavigate } from "react-router-dom"
import { canEditGroup, driverGroupDeleteErrors, driverGroupEditErrors } from "./driverGroupUtility"

interface driverGroupEditType<T> {
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>
  group: driverGroupType // The specific group we're editing.
  setGroup: React.Dispatch<React.SetStateAction<driverGroupType>>
  groups: driverGroupType[] // all groups from backend.
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>>
  setSelected: React.Dispatch<React.SetStateAction<string>>
  style?: React.CSSProperties
}

export interface driverGroupEditFormType {
  _id: string | null
  groupName: string
  drivers: driverType[]
  icon: File | null
  profile_picture: File | null
}

export interface driverGroupEditFormErrType {
  groupName: string
  drivers: string
  dropzone: string
  [key: string]: string
}

const DriverGroupEdit = <T extends { driverGroup: driverGroupType | null }>({
  setForm,
  user,
  setUser,
  setIsEdit, 
  group, 
  setGroup,
  groups,
  setGroups,
  setSelected,
  style
}: driverGroupEditType<T>) => {
  const [ isDriverEdit, setIsDriverEdit ] = useState<boolean>(false) // Render isDriverEdit or not.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ driver, setDriver ] = useState<driverType>(initDriver(user)) // If we're editing a driver rather than making a new one, populate.
  const [ drivers, setDrivers ] = useState<driverType[]>([]) // Drivers requested from DB.
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ editForm, setEditForm ] = useState<driverGroupEditFormType>({
    _id: group._id ? group._id : "",
    groupName: group.name ? group.name : "",
    drivers: group.drivers ? group.drivers : [], // All the drivers that belong to the driver group.
    icon: null,
    profile_picture: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<driverGroupEditFormErrType>({
    groupName: "",
    drivers: "",
    dropzone: "",
  })

  const navigate = useNavigate()

  const deleteDriverGroupHandler = async () => {
    // Check for Errors
    if (driverGroupDeleteErrors(group, setEditFormErr)) {
      return
    }
    // Send request to delete driver group from the DB and mutate form state
    if (await deleteDriverGroup(group, setGroups, setForm, user, setUser, navigate, setDelLoading, setBackendErr)) {
      // Redirect back to previous page and clear driver information
      setIsEdit(false)
      setGroup(initDriverGroup(user))
    }
  }

  const updateDriverHandler = async () => {
    // Check for Errors
    if (driverGroupEditErrors(editForm, setEditFormErr, groups, true)) {
      return
    }
    // Send request to update driver group in the DB and mutate form state
    if (await updateDriverGroup(group, editForm, setForm, user, setUser, navigate, setLoading, setBackendErr, setGroups)) {
      // Redirect back to previous page and clear driver information
      setIsEdit(false)
      setGroup(initDriverGroup(user))
    }
  }

  const onSubmitHandler = async () => {
    // Check for Errors
    if (driverGroupEditErrors(editForm, setEditFormErr, groups)) {
      return
    }
    // Send request to add a new driver group to the DB and mutate form state
    if (await newDriverGroup(editForm, setForm, user, setUser, navigate, setLoading, setBackendErr, setGroups, setSelected)) {
      // Redirect back to previous page and clear driver information
      setIsEdit(false)
      setGroup(initDriverGroup(user))
    }
  }

  return isDriverEdit ? 
    <DriverEdit
      setIsDriverEdit={setIsDriverEdit}
      setForm={setEditForm}
      driver={driver}
      setDriver={setDriver}
      user={user}
      setUser={setUser}
      backendErr={backendErr}
      setBackendErr={setBackendErr}
      drivers={drivers}
      style={style}
    /> : (
    <div className="driver-group-edit" style={style}>
      <h4>{`${!group.name ? `New` : `Edit`} Group`}</h4>
      <DropZone<driverGroupEditFormType, driverGroupEditFormErrType>
        form={editForm}
        setForm={setEditForm}
        formErr={editFormErr}
        setFormErr={setEditFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Group Image"
        thumbImg={group.url ? group.url : false}
        disabled={!canEditGroup(group, user)}
      />
      <TextField
        name="groupName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("groupName", editFormErr, backendErr)}
        variant="filled" 
        onChange={e => updateForm<driverGroupEditFormType, driverGroupEditFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.groupName}
        error={editFormErr.groupName || backendErr.type === "groupName" ? true : false}
        disabled={!canEditGroup(group, user)}
      />
      <DriverPicker
        user={user}
        setUser={setUser}
        setForm={setForm}
        editForm={editForm}
        setEditForm={setEditForm}
        editFormErr={editFormErr}
        setEditFormErr={setEditFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        group={group}
        setGroup={setGroup}
        setGroups={setGroups}
        setIsDriverEdit={setIsDriverEdit}
        setDriver={setDriver}
        setDrivers={setDrivers}
      />
      <div className="button-bar">
        <Button
          className="mui-button-back"
          variant="contained" 
          color="inherit"
          onClick={e => {
            setIsEdit(false)
            setGroup(initDriverGroup(user))
          }}
        >Back</Button>
        {canEditGroup(group, user) === "delete" && group._id && <Button
          variant="contained" 
          color="error"
          onClick={e => deleteDriverGroupHandler()}
          startIcon={delLoading && <CircularProgress size={20} color={"inherit"}/>}
        >Delete</Button>}
        <Button
          variant="contained"
          disabled={group.drivers.length < 2}
          onClick={e => editForm._id ? updateDriverHandler() : onSubmitHandler()}
          startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
        >Submit</Button>
      </div>
    </div>
  )
}

export default DriverGroupEdit
