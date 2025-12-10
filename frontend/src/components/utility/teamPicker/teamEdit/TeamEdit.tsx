import React, { useState } from "react"
import './_teamEdit.scss'
import { teamType } from "../../../../shared/types"
import DropZone from "../../dropZone/DropZone"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import { Button, CircularProgress, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import MUICountrySelect, { countryType, findCountryByString } from "../../muiCountrySelect/MUICountrySelect"
import { initTeam } from "../../../../shared/init"
import MUIDatePicker from "../../muiDatePicker/MUIDatePicker"
import moment, { Moment } from "moment"
import { deleteTeam, newTeam, updateTeam } from "../../../../shared/requests/teamRequests"
import { useNavigate } from "react-router-dom"
import { userType } from "../../../../shared/localStorage"
import { teamDeleteErrors, canEditTeam, teamEditErrors } from "./teamEditUtility"

interface teamEditType<T> {
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  team: teamType // The team in question.
  setTeam: React.Dispatch<React.SetStateAction<teamType>>
  teams: teamType[] // Teams requested from DB.
  style?: React.CSSProperties
}

export interface teamEditFormType {
  _id: string | null
  teamName: string
  inceptionDate: Moment | null
  nationality: countryType | null
  icon: File | string | null
  profile_picture: File | string | null
}

export interface teamEditFormErrType {
  teamName: string
  inceptionDate: string
  nationality: string
  dropzone: string
  [key: string]: string
}

const TeamEdit = <T extends { teams: teamType[] }>({ 
  setIsEdit, 
  setForm, 
  user, 
  setUser, 
  team, 
  setTeam,
  teams,
  style,
}: teamEditType<T>) => {
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
  const [ editForm, setEditForm ] = useState<teamEditFormType>({
    _id: team._id ? team._id : null,
    teamName: team.name ? team.name : "",
    inceptionDate: team.stats.inceptionDate ? moment(team.stats.inceptionDate) : null,
    nationality: team.stats.nationality ? findCountryByString(team.stats.nationality) : null,
    icon: null,
    profile_picture: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<teamEditFormErrType>({
    teamName: "",
    inceptionDate: "",
    nationality: "",
    dropzone: "",
  })

  const navigate = useNavigate()

  const deleteTeamHandler = async () => {
    // Check for Errors
    if (teamDeleteErrors(team, setEditFormErr)) {
      return
    }
    // Send request to delete from DB and mutate form state
    if (await deleteTeam(team, setForm, user, setUser, navigate, setDelLoading, setBackendErr)) {
      // Redirect back to previous page and clear team information
      setIsEdit(false)
      setTeam(initTeam(user))
    }
  }

  const updateTeamHandler = async () => {
    // Check for Errors
    if (teamEditErrors(editForm, setEditFormErr, teams, true)) {
      return
    }
    // Send request to update the team in DB and mutate form state
    if (await updateTeam(team, editForm, setEditForm, setForm, user, setUser, navigate, setLoading, setBackendErr)) {
      // Redirect back to previous page and clear team information
      setIsEdit(false)
      setTeam(initTeam(user))
    }
  }

  const onSubmitHandler = async () => {
    // Check for Errors
    if (teamEditErrors(editForm, setEditFormErr, teams)) {
      return
    }
    // Send request to add a new team to the DB and mutate form state
    if (await newTeam(editForm, setEditForm, setForm, user, setUser, navigate, setLoading, setBackendErr)) {
      // Redirect back to previous page and clear team information
      setIsEdit(false)
      setTeam(initTeam(user))
    }
  }

  return (
    <div className="team-edit" style={style}>
      <h4>{`${!team.name ? `New` : `Edit`} Team`}</h4>
      <DropZone<teamEditFormType, teamEditFormErrType>
        form={editForm}
        setForm={setEditForm}
        formErr={editFormErr}
        setFormErr={setEditFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Team Logo"
        thumbImg={team.url ? team.url : false}
        style={{ marginBottom: 40 }}
        disabled={!canEditTeam(team, user)}
      />
      <TextField
        name="teamName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("teamName", editFormErr, backendErr)}
        variant="filled" 
        onChange={e => updateForm<teamEditFormType, teamEditFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.teamName}
        error={editFormErr.teamName || backendErr.type === "teamName" ? true : false}
        disabled={!canEditTeam(team, user)}
      />
      <MUICountrySelect
        label={inputLabel("nationality", editFormErr, backendErr)}
        value={editForm.nationality}
        disabled={!canEditTeam(team, user)}
        error={editFormErr.nationality || backendErr.type === "nationality" ? true : false}
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
      <MUIDatePicker
        label={inputLabel("inceptionDate", editFormErr, backendErr)}
        value={editForm.inceptionDate as null}
        disabled={!canEditTeam(team, user)}
        error={editFormErr.inceptionDate || backendErr.type === "inceptionDate" ? true : false}
        className="mui-form-el"
        onChange={(newValue: Moment | null) => {
          setEditForm(prevForm => {
            return {
              ...prevForm,
              inceptionDate: newValue
            }
          })

          setEditFormErr(prevErrs => {
            return {
              ...prevErrs,
              inceptionDate: "",
            }
          })
        }}
      />
      <div className="button-bar">
        <Button
          className="mui-button-back"
          variant="contained" 
          color="inherit"
          onClick={() => {
            setTeam(initTeam(user))
            setIsEdit(false)
          }}
        >Back</Button>
        {canEditTeam(team, user) === "delete" && team._id && <Button
          variant="contained" 
          color="error"
          onClick={() => deleteTeamHandler()}
          startIcon={delLoading && <CircularProgress size={20} color={"inherit"}/>}
        >Delete</Button>}
        <Button
          variant="contained"
          onClick={() => editForm._id ? updateTeamHandler() : onSubmitHandler()}
          disabled={!canEditTeam(team, user)}
          startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
        >{editForm._id ? "Update" : "Submit"}</Button>
      </div>
    </div>
  )
}

export default TeamEdit
