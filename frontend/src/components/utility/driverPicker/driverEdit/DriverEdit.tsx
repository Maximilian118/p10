import React, { useState } from "react"
import './_driverEdit.scss'
import DropZone from "../../dropZone/DropZone"
import { Button, CircularProgress, InputAdornment, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { driverType, teamType } from "../../../../shared/types"
import MUIAutocomplete from "../../muiAutocomplete/muiAutocomplete"
import { heightCMOptions, weightKGOptions } from "../../../../shared/utility"
import moment, { Moment } from "moment"
import MUIDatePicker from "../../muiDatePicker/MUIDatePicker"
import { Abc } from "@mui/icons-material"
import MUICheckbox from "../../muiCheckbox/MUICheckbox"
import { userType } from "../../../../shared/localStorage"
import { initDriver, initTeam } from "../../../../shared/init"
import MUICountrySelect, { countryType, findCountryByString } from "../../muiCountrySelect/MUICountrySelect"
import TeamEdit from "../../teamPicker/teamEdit/TeamEdit"
import TeamPicker from "../../teamPicker/TeamPicker"
import { deleteDriver, newDriver, updateDriver } from "../../../../shared/requests/driverRequests"
import { useNavigate } from "react-router-dom"
import { canEditDriver, driverDeleteErrors, driverEditErrors } from "./driverEditUtility"

interface driverEditType<T> {
  setIsDriverEdit: React.Dispatch<React.SetStateAction<boolean>>
  setForm: React.Dispatch<React.SetStateAction<T>> // form state for driver group
  driver: driverType // driver that's being updated
  setDriver: React.Dispatch<React.SetStateAction<driverType>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  drivers: driverType[]
  style?: React.CSSProperties
}

export interface driverEditFormType {
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

export interface driverEditFormErrType {
  driverName: string
  driverID: string
  teams: string
  nationality: string
  heightCM: string
  weightKG: string
  birthday: string
  moustache: string
  mullet: string
  dropzone: string
  dropzoneBody: string
  [key: string]: string
}

const DriverEdit = <T extends { drivers: driverType[] }>({ 
  setIsDriverEdit, 
  setForm, 
  driver, 
  setDriver, 
  user, 
  setUser, 
  backendErr, 
  setBackendErr, 
  drivers,
  style,
  }: driverEditType<T>) => {
  const [ isEdit, setIsEdit ] = useState<boolean>(false) // Render TeamEdit or not.
  const [ team, setTeam ] = useState<teamType>(initTeam(user)) // If we're editing a team rather than making a new one, populate.
  const [ teams, setTeams ] = useState<teamType[]>([]) // Teams requested from DB.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ editForm, setEditForm ] = useState<driverEditFormType>({
    _id: driver._id ? driver._id : null,
    driverName: driver.name ? driver.name : "",
    driverID: driver.driverID ? driver.driverID : "",
    teams: driver.teams ? driver.teams : [], // All the teams the driver currently belongs to.
    nationality: driver.stats.nationality ? findCountryByString(driver.stats.nationality) : null,
    heightCM: driver.stats.heightCM ? `${driver.stats.heightCM}cm` : null,
    weightKG: driver.stats.weightKG ? `${driver.stats.weightKG}kg` : null,
    birthday: driver.stats.birthday ? moment(driver.stats.birthday) : null,
    moustache: driver.stats.moustache ? driver.stats.moustache : false,
    mullet: driver.stats.mullet ? driver.stats.mullet : false,
    icon: null,
    profile_picture: null,
    body: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<driverEditFormErrType>({
    driverName: "",
    driverID: "",
    teams: "",
    nationality: "",
    heightCM: "",
    weightKG: "",
    birthday: "",
    moustache: "",
    mullet: "",
    dropzone: "",
    dropzoneBody: "",
  })

  const navigate = useNavigate()

  const deleteDriverHandler = async () => {
    // Check for Errors
    if (driverDeleteErrors(driver, setEditFormErr)) {
      return
    }
    // Send request to delete from DB and mutate form state
    if (await deleteDriver(driver, setForm, user, setUser, navigate, setDelLoading, setBackendErr)) {
      // Redirect back to previous page and clear driver information
      setIsDriverEdit(false)
      setDriver(initDriver(user))
    }
  }

  const updateDriverHandler = async () => {
    if (driverEditErrors(editForm, setEditFormErr, drivers, true)) {
      return
    }
    // Send request to update a driver and mutate form state
    if (await updateDriver(driver, editForm, setEditForm, setForm, user, setUser, navigate, setBackendErr, setLoading)) {
      // Redirect back to previous page and clear driver information
      setIsDriverEdit(false)
      setDriver(initDriver(user))
    }
  }

  const onSubmitHandler = async () => {
    // Check for Errors
    if (driverEditErrors(editForm, setEditFormErr, drivers)) {
      return
    }
    // Send request to add a new driver to the DB and mutate form state
    if (await newDriver(editForm, setEditForm, setForm, user, setUser, navigate, setLoading, setBackendErr)) {
      // Redirect back to previous page and clear driver information
      setIsDriverEdit(false)
      setDriver(initDriver(user))
    }
  }

  return isEdit ? 
    <TeamEdit
      setIsEdit={setIsEdit}
      setForm={setEditForm}
      user={user}
      setUser={setUser}
      team={team}
      setTeam={setTeam}
      teams={teams}
      style={style}
    /> : (
    <div className="driver-edit" style={style}>
      <h4>{`${!driver.name ? `New` : `Edit`} Driver`}</h4>
      <div className="driver-edit-dropzones">
        <div className="driver-edit-dropzone-container">
          <DropZone<driverEditFormType, driverEditFormErrType>
            form={editForm}
            setForm={setEditForm}
            formErr={editFormErr}
            setFormErr={setEditFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            purposeText="Driver Headshot"
            thumbImg={driver.icon ? driver.icon : false}
            disabled={!canEditDriver(driver, user)}
          />
        </div>
        <div className="driver-edit-dropzone-container">
          <DropZone<driverEditFormType, driverEditFormErrType>
            form={editForm}
            setForm={setEditForm}
            formErr={editFormErr}
            setFormErr={setEditFormErr}
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            purposeText="Driver Full Body"
            thumbImg={driver.body ? driver.body : false}
            disabled={!canEditDriver(driver, user)}
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
        label={inputLabel("driverName", editFormErr, backendErr)}
        variant="filled" 
        onChange={e => updateForm<driverEditFormType, driverEditFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.driverName}
        error={editFormErr.driverName || backendErr.type === "driverName" ? true : false}
        disabled={!canEditDriver(driver, user)}
      />
      <MUICountrySelect
        label={inputLabel("nationality", editFormErr, backendErr)}
        value={editForm.nationality}
        error={editFormErr.nationality || backendErr.type === "nationality" ? true : false}
        disabled={!canEditDriver(driver, user)}
        onChange={(e, val) => {
          setEditForm(prevForm => {
            return {
              ...prevForm,
              nationality: val
            }
          })

          setEditFormErr(prevErrs => {
            return {
              ...prevErrs,
              nationality: "",
            }
          })
        }}
      />
      <TeamPicker
        user={user}
        setUser={setUser}
        driver={driver}
        setForm={setForm}
        editForm={editForm}
        setEditForm={setEditForm}
        editFormErr={editFormErr}
        setEditFormErr={setEditFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        setIsEdit={setIsEdit}
        setTeam={setTeam}
        setTeams={setTeams}
        setDriver={setDriver}
      />
      <div className="driver-edit-stats">
        <MUIAutocomplete
          label={inputLabel("heightCM", editFormErr, backendErr)}
          options={heightCMOptions()}
          value={editForm.heightCM}
          error={editFormErr.heightCM || backendErr.type === "heightCM" ? true : false}
          disabled={!canEditDriver(driver, user)}
          setValue={(value) => {
            setEditForm(prevForm => {
              return {
                ...prevForm,
                heightCM: value as string
              }
            })
          }}
          onChange={() => setEditFormErr(prevErrs => {
            return {
              ...prevErrs,
              heightCM: "",
            }
          })}
        />
        <MUIAutocomplete
          label={inputLabel("weightKG", editFormErr, backendErr)}
          options={weightKGOptions()}
          value={editForm.weightKG}
          error={editFormErr.weightKG || backendErr.type === "weightKG" ? true : false}
          disabled={!canEditDriver(driver, user)}
          setValue={(value) => {
            setEditForm(prevForm => {
              return {
                ...prevForm,
                weightKG: value as string
              }
            })
          }}
          onChange={() => setEditFormErr(prevErrs => {
            return {
              ...prevErrs,
              weightKG: "",
            }
          })}
        />
      </div>
      <div className="driver-edit-stats">
        <MUIDatePicker
          label={inputLabel("birthday", editFormErr, backendErr)}
          value={editForm.birthday as null}
          error={editFormErr.birthday || backendErr.type === "birthday" ? true : false}
          disabled={!canEditDriver(driver, user)}
          onChange={(newValue: Moment | null) => {
            setEditForm(prevForm => {
              return {
                ...prevForm,
                birthday: newValue
              }
            })

            setEditFormErr(prevErrs => {
              return {
                ...prevErrs,
                birthday: "",
              }
            })
          }}
        />
        <TextField
          name="driverID"
          label={inputLabel("driverID", editFormErr, backendErr)}
          variant="filled" 
          onChange={e => updateForm<driverEditFormType, driverEditFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
          value={editForm.driverID}
          error={editFormErr.driverID || backendErr.type === "driverID" ? true : false}
          disabled={!canEditDriver(driver, user)}
          inputProps={{ maxLength: 3 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Abc/>
              </InputAdornment>
            ),
          }}
        />
      </div>
      <div className="driver-edit-checkboxes">
        <MUICheckbox
          text="Moustache"
          checked={editForm.moustache}
          disabled={!canEditDriver(driver, user)}
          onClick={() => setEditForm(prevForm => {
            return {
              ...prevForm,
              moustache: !prevForm.moustache,
            }
          })}
          textRight
        />
        <MUICheckbox
          text="Mullet"
          checked={editForm.mullet}
          disabled={!canEditDriver(driver, user)}
          onClick={() => setEditForm(prevForm => {
            return {
              ...prevForm,
              mullet: !prevForm.mullet,
            }
          })}
          textRight
        />
      </div>
      <div className="button-bar">
        <Button
          className="mui-button-back"
          variant="contained" 
          color="inherit"
          onClick={() => {
            setIsDriverEdit(false)
            setDriver(initDriver(user))
          }}
        >Back</Button>
        {canEditDriver(driver, user) === "delete" && driver._id && <Button
          variant="contained" 
          color="error"
          onClick={() => deleteDriverHandler()}
          startIcon={delLoading && <CircularProgress size={20} color={"inherit"}/>}
        >Delete</Button>}
        <Button
          variant="contained"
          disabled={!canEditDriver(driver, user)}
          onClick={() => editForm._id ? updateDriverHandler() : onSubmitHandler()}
          startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
        >{editForm._id ? "Update" : "Submit"}</Button>
      </div>
    </div>
  )
}

export default DriverEdit