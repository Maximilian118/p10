import React, { useEffect, useState } from "react"
import './_driverPicker.scss'
import MUIAutocomplete from "../muiAutocomplete/muiAutocomplete"
import { inputLabel } from "../../../shared/formValidation"
import { seriesType, driverType } from "../../../shared/types"
import { useNavigate } from "react-router-dom"
import { getDrivers } from "../../../shared/requests/driverRequests"
import { userType } from "../../../shared/localStorage"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import DriverCard from "../../cards/driverCard/DriverCard"
import { canEditDriver } from "./driverEdit/driverEditUtility"
import { sortAlphabetically } from "../../../shared/utility"
import { canEditSeries } from "../seriesPicker/seriesEdit/seriesUtility"
import AddButton from "../button/addButton/AddButton"
import { updateSeries } from "../../../shared/requests/seriesRequests"
import { seriesEditFormType } from "../seriesPicker/seriesEdit/SeriesEdit"

interface driverPickerType<T, U, V> {
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setForm: React.Dispatch<React.SetStateAction<V>> // Form state for champ.
  editForm: T // editForm for series state.
  setEditForm: React.Dispatch<React.SetStateAction<T>>
  editFormErr: U // editForm Errors for series state.
  setEditFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  series: seriesType
  setSeries: React.Dispatch<React.SetStateAction<seriesType>>
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>> // Series retrieved from the DB.
  setIsDriverEdit: React.Dispatch<React.SetStateAction<boolean>>
  setDriver: React.Dispatch<React.SetStateAction<driverType>>
  setDrivers?: React.Dispatch<React.SetStateAction<driverType[]>> // Drivers requested from DB in a state of parent.
}

// Component for picking drivers to add to a series.
const DriverPickerChampForm = <T extends seriesEditFormType, U extends { drivers: string }, V extends { series: seriesType | null }>({
  user,
  setUser,
  setForm,
  editForm,
  setEditForm,
  editFormErr,
  setEditFormErr,
  backendErr,
  setBackendErr,
  series,
  setSeries,
  setSeriesList,
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
      // Get all drivers in the database so the user can select existing drivers for the series.
      getDrivers(setLocalDrivers, user, setUser, navigate, setLoading, setBackendErr)
    }
    setReqSent(true)
  }, [localDrivers, setLocalDrivers, reqSent, user, setUser, navigate, setBackendErr])

  // Expose requested drivers to a higher state.
  useEffect(() => {
    if (setDrivers) setDrivers(localDrivers)
  }, [localDrivers, setDrivers])

  // Remove a driver from the series.
  const removeDriverHandler = async (driver: driverType) => {
    const filteredDrivers = editForm.drivers.filter(d => d._id !== driver._id)
    const withoutDriver: T = {
      ...editForm,
      drivers: filteredDrivers,
    }
    // Remove this driver from series form state.
    setEditForm(() => withoutDriver)
    // Remove this driver from the series state the form state is based upon.
    setSeries(prevSeries => {
      return {
        ...prevSeries,
        drivers: filteredDrivers,
      }
    })
    // If we're editing an existing series.
    if (series._id) {
      // Cast setEditForm since T extends seriesEditFormType and updateSeries expects seriesEditFormType.
      await updateSeries(series, withoutDriver, setEditForm as React.Dispatch<React.SetStateAction<seriesEditFormType>>, setForm, user, setUser, navigate, setLoading, setBackendErr, setSeriesList)
    }
  }

  // Add a driver to the series.
  const addDriverHandler = async (driver: driverType) => {
    const addedDriver = [
      driver,
      ...editForm.drivers,
    ]

    const withDriver: T = {
      ...editForm,
      drivers: addedDriver,
    }
    // Add this driver to series form local form state.
    setEditForm(() => withDriver)
    // Update state of series the local form is based upon.
    setSeries(prevSeries => {
      return {
        ...prevSeries,
        drivers: addedDriver,
      }
    })
    // If we're editing an existing series.
    if (series._id) {
      // Cast setEditForm since T extends seriesEditFormType and updateSeries expects seriesEditFormType.
      await updateSeries(series, withDriver, setEditForm as React.Dispatch<React.SetStateAction<seriesEditFormType>>, setForm, user, setUser, navigate, setLoading, setBackendErr, setSeriesList)
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
          setEditFormErr(prevErrs => { // Remove errors onChange.
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
            canRemove={!!canEditSeries(series, user)}
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

export default DriverPickerChampForm
