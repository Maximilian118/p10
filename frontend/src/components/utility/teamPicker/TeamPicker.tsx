import React, { useEffect, useState } from "react"
import './_teamPicker.scss'
import MUIAutocomplete from "../muiAutocomplete/muiAutocomplete"
import { inputLabel } from "../../../shared/formValidation"
import { getTeams } from "../../../shared/requests/teamRequests"
import { driverType, teamType } from "../../../shared/types"
import { userType } from "../../../shared/localStorage"
import { useNavigate } from "react-router-dom"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import TeamCard from "../../cards/teamCard/TeamCard"
import { canEditTeam } from "./teamEdit/teamEditUtility"
import { canEditDriver } from "../driverPicker/driverEdit/driverEditUtility"
import { sortAlphabetically } from "../../../shared/utility"
import { updateDriver } from "../../../shared/requests/driverRequests"
import { driverEditFormType } from "../driverPicker/driverEdit/DriverEdit"
import AddButton from "../button/addButton/AddButton"

interface teamPickerType<T, U, V> {
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  driver: driverType
  setForm: React.Dispatch<React.SetStateAction<V>>
  editForm: T
  setEditForm: React.Dispatch<React.SetStateAction<T>>
  editFormErr: U
  setEditFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>
  setTeam: React.Dispatch<React.SetStateAction<teamType>>
  setTeams?: React.Dispatch<React.SetStateAction<teamType[]>> // Teams requested from DB in a state of parent.
  setDriver?: React.Dispatch<React.SetStateAction<driverType>>
}

const TeamPicker = <T extends driverEditFormType, U extends { teams: string }, V extends { drivers: driverType[] }>({ 
  user, 
  setUser,
  driver,
  setForm,
  editForm, 
  setEditForm, 
  editFormErr, 
  setEditFormErr, 
  backendErr, 
  setBackendErr, 
  setIsEdit, 
  setTeam,
  setTeams,
  setDriver,
  }: teamPickerType<T, U, V>) => {
  const [ localTeams, setLocalTeams ] = useState<teamType[]>([]) // All teams in db.
  const [ value, setValue ] = useState<teamType | null>(null) // Current value of Autocomplete.
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ loading, setLoading ] = useState<boolean>(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (localTeams.length === 0 && !reqSent) {
      // Get all teams in the database so the user can select existing teams for the driver.
      getTeams(setLocalTeams, user, setUser, navigate, setLoading, setBackendErr)
    }
    setReqSent(true)
  }, [localTeams, setLocalTeams, reqSent, user, setUser, navigate, setBackendErr])

  useEffect(() => { // Expose requested teams to a higher state.
    setTeams && setTeams(localTeams)
  }, [localTeams, setTeams])

  const removeTeamHandler = async (team: teamType) => {
    const filteredTeams = editForm.teams.filter(t => t._id !== team._id)
    const withoutTeam: T = {
      ...editForm,
      teams: filteredTeams,
    }
    // Remove this team from driver form state.
    setEditForm(() => withoutTeam)
    // If we're editing an existing driver.
    if (driver._id) {
      // Remove this team from the driver in db.
      // Cast setEditForm since T extends driverEditFormType and updateDriver expects driverEditFormType.
      if (await updateDriver(driver, withoutTeam, setEditForm as React.Dispatch<React.SetStateAction<driverEditFormType>>, setForm, user, setUser, navigate, setBackendErr) && setDriver) {
        // Update the driver we're editing.
        setDriver(prevDriver => {
          return {
            ...prevDriver,
            teams: filteredTeams
          }
        })
      }
    }
  }

  const addTeamHandler = async (team: teamType) => {
    const addedTeam = [
      team,
      ...editForm.teams,
    ]

    const withTeam: T = {
      ...editForm,
      teams: addedTeam
    }
    // Add this team to driver form state.
    setEditForm(() => withTeam)
    // If we're editing an existing driver.
    if (driver._id) {
      // Add this driver to the team in db.
      // Cast setEditForm since T extends driverEditFormType and updateDriver expects driverEditFormType.
      if (await updateDriver(driver, withTeam, setEditForm as React.Dispatch<React.SetStateAction<driverEditFormType>>, setForm, user, setUser, navigate, setBackendErr) && setDriver) {
        // Update the driver we're editing.
        setDriver(prevDriver => {
          return {
            ...prevDriver,
            teams: addedTeam
          }
        })
      }
    }
  }

  return (
    <div className="team-picker">
      <MUIAutocomplete
        label={inputLabel("teams", editFormErr, backendErr)}
        displayNew="always"
        customNewLabel="Team"
        onNewMouseDown={() => setIsEdit(true)}
        options={localTeams.filter(team => !editForm.teams.some(t => t._id === team._id))}
        value={value ? value.name : null}
        loading={loading}
        error={editFormErr.teams || backendErr.type === "teams" ? true : false}
        setObjValue={(value) => setValue(value)}
        onLiClick={(team) => addTeamHandler(team)}
        onChange={() => 
          setEditFormErr(prevErrs => {
            return {
              ...prevErrs,
              teams: "",
            }
          }
        )}
      />
      <div className="team-picker-list">
        {sortAlphabetically(editForm.teams).map((team: teamType, i: number) => (
            <TeamCard 
              key={i} 
              team={team}
              canEdit={!!canEditTeam(team, user)}
              onRemove={(team) => removeTeamHandler(team)}
              canRemove={!!canEditDriver(driver, user)}
              onClick={(team) => {
                setTeam(team)
                setIsEdit(true)
              }}
            />
          ))
        }
      </div>
      <AddButton
        onClick={() => setIsEdit(true)}
        absolute
      />
    </div>
  )
}

export default TeamPicker
