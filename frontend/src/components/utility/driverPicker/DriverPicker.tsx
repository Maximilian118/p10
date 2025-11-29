import React, { useEffect, useState } from "react"
import './_driverPicker.scss'
import MUIAutocomplete from "../muiAutocomplete/muiAutocomplete"
import { inputLabel } from "../../../shared/formValidation"
import { driverGroupType, driverType } from "../../../shared/types"
import { useNavigate } from "react-router-dom"
import { getDrivers } from "../../../shared/requests/driverRequests"
import { userType } from "../../../shared/localStorage"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import DriverCard from "../../cards/driverCard/DriverCard"
import { canEditDriver } from "./driverEdit/driverEditUtility"
import { sortAlphabetically } from "../../../shared/utility"
import { canEditGroup } from "../driverGroupPicker/driverGroupEdit/driverGroupUtility"
import AddButton from "../button/addButton/AddButton"
import { updateDriverGroup } from "../../../shared/requests/driverGroupRequests"
import { driverGroupEditFormType } from "../driverGroupPicker/driverGroupEdit/DriverGroupEdit"

interface driverPickerType<T, U, V> {
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setForm: React.Dispatch<React.SetStateAction<V>> // Form state for champ.
  editForm: T // editForm for driver group state
  setEditForm: React.Dispatch<React.SetStateAction<T>>
  editFormErr: U // editForm Errors for driver group state
  setEditFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  group: driverGroupType
  setGroup: React.Dispatch<React.SetStateAction<driverGroupType>>
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>> // Groups retrieved from the DB.
  setIsDriverEdit: React.Dispatch<React.SetStateAction<boolean>>
  setDriver: React.Dispatch<React.SetStateAction<driverType>>
  setDrivers?: React.Dispatch<React.SetStateAction<driverType[]>> // Drivers requested from DB in a state of parent.
}

const DriverPicker = <T extends driverGroupEditFormType, U extends { drivers: string }, V extends { driverGroup: driverGroupType | null }>({
  user,
  setUser,
  setForm,
  editForm,
  setEditForm,
  editFormErr,
  setEditFormErr,
  backendErr,
  setBackendErr,
  group,
  setGroup,
  setGroups,
  setIsDriverEdit,
  setDriver,
  setDrivers,
}: driverPickerType<T, U, V>) => {
  const [ localDrivers, setLocalDrivers ] = useState<driverType[]>([]) // All drivers in db.
  const [ value, setValue ] = useState<driverType | null>(null) // Current value of Autocomplete.
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ loading, setLoading ] = useState<boolean>(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (localDrivers.length === 0 && !reqSent) {
      // Get all drivers in the database so the user can select existing drivers for the group.
      getDrivers(setLocalDrivers, user, setUser, navigate, setLoading, setBackendErr)
    }
    setReqSent(true)
  }, [localDrivers, setLocalDrivers, reqSent, user, setUser, navigate, setBackendErr])

  useEffect(() => { // Expose requested drivers to a higher state.
    setDrivers && setDrivers(localDrivers)
  }, [localDrivers, setDrivers])

  const removeDriverHandler = async (driver: driverType) => {
    const filteredDrivers = editForm.drivers.filter(d => d._id !== driver._id)
    const withoutDriver: T = {
      ...editForm,
      drivers: filteredDrivers,
    }
    // Remove this driver from group form state.
    setEditForm(() => withoutDriver)
    // Remove this driver from the group state the form state is based upon.
    setGroup(prevGroup => {
      return {
        ...prevGroup,
        drivers: filteredDrivers,
      }
    })
    // If we're editing an existing group.
    if (group._id) {
      await updateDriverGroup(group, withoutDriver, setForm, user, setUser, navigate, setLoading, setBackendErr, setGroups)
    }
  }

  const addDriverHandler = async (driver: driverType) => {
    const addedDriver = [
      driver,
      ...editForm.drivers,
    ]

    const withDriver: T = {
      ...editForm,
      drivers: addedDriver,
    }
    // Add this driver to driver group form local form state.
    setEditForm(() => withDriver)
    // update state of group the local form is based upon.
    setGroup(prevGroup => {
      return {
        ...prevGroup,
        drivers: addedDriver,
      }
    })
    // If we're editing an existing group.
    if (group._id) {
      await updateDriverGroup(group, withDriver, setForm, user, setUser, navigate, setLoading, setBackendErr, setGroups)
      // Request
    }
  }

  return (
    <div className="driver-picker">
      <MUIAutocomplete
        label={inputLabel("drivers", editFormErr, backendErr)}
        displayNew="always"
        customNewLabel="Driver"
        onNewMouseDown={() => setIsDriverEdit(true)}
        options={localDrivers.filter(driver => !editForm.drivers.some(d => d._id === driver._id))}
        value={value ? value.name : null}
        loading={loading}
        error={editFormErr.drivers || backendErr.type === "drivers" ? true : false}
        setObjValue={(value) => {
          setValue(value)
        }}
        onLiClick={(value) => addDriverHandler(value)}
        onChange={() => 
          setEditFormErr(prevErrs => { // Remove an errors onChange
            return {
              ...prevErrs,
              drivers: "",
            }
          }
        )}
      />
      <div className="driver-picker-list">
        {sortAlphabetically(editForm.drivers).map((driver: driverType, i: number) => (
          <DriverCard 
            key={i} 
            driver={driver}
            canEdit={!!canEditDriver(driver, user)}
            onRemove={(driver) => removeDriverHandler(driver)}
            canRemove={!!canEditGroup(group, user)}
            onClick={() => {
              setDriver(driver)
              setIsDriverEdit(true)
            }}
          />
        ))}
        <AddButton
          onClick={() => {
            setIsDriverEdit(true)
          }}
          absolute
        />
      </div>
    </div>
  )
}

export default DriverPicker
