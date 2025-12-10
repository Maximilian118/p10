import React, { useState } from "react"
import './_seriesEdit.scss'
import { seriesType, driverType } from "../../../../shared/types"
import DropZone from "../../dropZone/DropZone"
import { Button, CircularProgress, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import DriverEdit from '../../driverPicker/driverEdit/DriverEdit'
import { userType } from "../../../../shared/localStorage"
import DriverPicker from "../../driverPicker/DriverPicker"
import { initDriver, initSeries } from "../../../../shared/init"
import { deleteSeries, newSeries, updateSeries } from "../../../../shared/requests/seriesRequests"
import { useNavigate } from "react-router-dom"
import { canEditSeries, seriesDeleteErrors, seriesEditErrors } from "./seriesUtility"

interface seriesEditType<T> {
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>
  series: seriesType // The specific series we're editing.
  setSeries: React.Dispatch<React.SetStateAction<seriesType>>
  seriesList: seriesType[] // all series from backend.
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>
  setSelected: React.Dispatch<React.SetStateAction<string>>
  style?: React.CSSProperties
}

export interface seriesEditFormType {
  _id: string | null
  seriesName: string
  drivers: driverType[]
  icon: File | null
  profile_picture: File | null
}

export interface seriesEditFormErrType {
  seriesName: string
  drivers: string
  dropzone: string
  [key: string]: string
}

// Component for editing or creating a new series.
const SeriesEdit = <T extends { series: seriesType | null }>({
  setForm,
  user,
  setUser,
  setIsEdit,
  series,
  setSeries,
  seriesList,
  setSeriesList,
  setSelected,
  style
}: seriesEditType<T>) => {
  const [ isDriverEdit, setIsDriverEdit ] = useState<boolean>(false) // Render isDriverEdit or not.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ driver, setDriver ] = useState<driverType>(initDriver(user)) // If we're editing a driver rather than making a new one, populate.
  const [ drivers, setDrivers ] = useState<driverType[]>([]) // Drivers requested from DB.
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ editForm, setEditForm ] = useState<seriesEditFormType>({
    _id: series._id ? series._id : "",
    seriesName: series.name ? series.name : "",
    drivers: series.drivers ? series.drivers : [], // All the drivers that belong to the series.
    icon: null,
    profile_picture: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<seriesEditFormErrType>({
    seriesName: "",
    drivers: "",
    dropzone: "",
  })

  const navigate = useNavigate()

  // Handler to delete series.
  const deleteSeriesHandler = async () => {
    // Check for Errors.
    if (seriesDeleteErrors(series, setEditFormErr)) {
      return
    }
    // Send request to delete series from the DB and mutate form state.
    if (await deleteSeries(series, setSeriesList, setForm, user, setUser, navigate, setDelLoading, setBackendErr)) {
      // Redirect back to previous page and clear series information.
      setIsEdit(false)
      setSeries(initSeries(user))
    }
  }

  // Handler to update series.
  const updateSeriesHandler = async () => {
    // Check for Errors.
    if (seriesEditErrors(editForm, setEditFormErr, seriesList, true)) {
      return
    }
    // Send request to update series in the DB and mutate form state.
    if (await updateSeries(series, editForm, setForm, user, setUser, navigate, setLoading, setBackendErr, setSeriesList)) {
      // Redirect back to previous page and clear series information.
      setIsEdit(false)
      setSeries(initSeries(user))
    }
  }

  // Handler to create new series.
  const onSubmitHandler = async () => {
    // Check for Errors.
    if (seriesEditErrors(editForm, setEditFormErr, seriesList)) {
      return
    }
    // Send request to add a new series to the DB and mutate form state.
    if (await newSeries(editForm, setForm, user, setUser, navigate, setLoading, setBackendErr, setSeriesList, setSelected)) {
      // Redirect back to previous page and clear series information.
      setIsEdit(false)
      setSeries(initSeries(user))
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
    <div className="series-edit" style={style}>
      <h4>{`${!series.name ? `New` : `Edit`} Series`}</h4>
      <DropZone<seriesEditFormType, seriesEditFormErrType>
        form={editForm}
        setForm={setEditForm}
        formErr={editFormErr}
        setFormErr={setEditFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Series Image"
        thumbImg={series.url ? series.url : false}
        disabled={!canEditSeries(series, user)}
      />
      <TextField
        name="seriesName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("seriesName", editFormErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<seriesEditFormType, seriesEditFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.seriesName}
        error={editFormErr.seriesName || backendErr.type === "seriesName" ? true : false}
        disabled={!canEditSeries(series, user)}
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
        series={series}
        setSeries={setSeries}
        setSeriesList={setSeriesList}
        setIsDriverEdit={setIsDriverEdit}
        setDriver={setDriver}
        setDrivers={setDrivers}
      />
      <div className="button-bar">
        <Button
          className="mui-button-back"
          variant="contained"
          color="inherit"
          onClick={() => {
            setIsEdit(false)
            setSeries(initSeries(user))
          }}
        >Back</Button>
        {canEditSeries(series, user) === "delete" && series._id && <Button
          variant="contained"
          color="error"
          onClick={() => deleteSeriesHandler()}
          startIcon={delLoading && <CircularProgress size={20} color={"inherit"}/>}
        >Delete</Button>}
        <Button
          variant="contained"
          disabled={editForm.drivers.length < 2}
          onClick={() => editForm._id ? updateSeriesHandler() : onSubmitHandler()}
          startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
        >Submit</Button>
      </div>
    </div>
  )
}

export default SeriesEdit
