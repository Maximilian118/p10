import React, { useEffect, useState } from "react"
import "./_driverGroupPicker.scss"
import { driverGroupType } from "../../../shared/types"
import { getDriverGroups } from "../../../shared/requests/driverGroupRequests"
import { userType } from "../../../shared/localStorage"
import { useNavigate } from "react-router-dom"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import DriverGroupEdit from "./driverGroupEdit/DriverGroupEdit"
import { initDriverGroup } from "../../../shared/init"
import DriverGroupCard from "../../cards/driverGroupCard/DriverGroupCard"
import { sortAlphabetically } from "../../../shared/utility"
import Search from "../search/Search"
import AddButton from "../button/addButton/AddButton"
import { canEditGroup } from "./driverGroupEdit/driverGroupUtility"
import FillLoading from "../fillLoading/FillLoading"

interface driverGroupPickerType<T> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  groups: driverGroupType[] // all groups from backend.
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  stepperBtns?: JSX.Element
  style?: React.CSSProperties
}

const DriverGroupPicker= <T extends { driverGroup: driverGroupType | null }>({ 
  form, 
  setForm,
  groups,
  setGroups,
  user, 
  setUser,
  backendErr,
  setBackendErr,
  stepperBtns,
  style,
}: driverGroupPickerType<T>) => {
  const [ isEdit, setIsEdit ] = useState<boolean>(false) // Render DriverGroupEdit or not.
  const [ group, setGroup ] = useState<driverGroupType>(initDriverGroup(user)) // If we're editing a driver group rather than making a new one, populate.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ search, setSearch ] = useState<driverGroupType[]>([])
  const [ selected, setSelected ] = useState<string>(form.driverGroup ? form.driverGroup._id! : "") // The Driver Group that's currently selected.

  const navigate = useNavigate()

  useEffect(() => {
    if (groups.length === 0 && !reqSent) {
      getDriverGroups(setGroups, user, setUser, navigate, setLoading, setBackendErr)
      setReqSent(true)
    }
  }, [navigate, user, setUser, groups, setGroups, setBackendErr, form, reqSent])

  const sortedGroups = sortAlphabetically(search ? search : groups) // All of the available groups.
  const selectedGroup = sortedGroups.find(group => group._id === selected) // find the single selected group from the array.

  return isEdit ? 
    <DriverGroupEdit
      setForm={setForm}
      user={user}
      setUser={setUser}
      setIsEdit={setIsEdit}
      group={group}
      setGroup={setGroup}
      groups={groups}
      setGroups={setGroups}
      setSelected={setSelected}
      style={style}
    /> : (
    <div className="driver-group-picker" style={style}>
      <Search
        original={groups}
        setSearch={setSearch}
      />
      <div className="driver-group-list-container">
        {selectedGroup && ( // If a group has been selected, display that group at the top of the page.
          <DriverGroupCard
            selected
            group={selectedGroup}
            canEdit={!!canEditGroup(selectedGroup, user)}
            onEditClicked={() => {
              setGroup(selectedGroup)
              setIsEdit(!isEdit)
            }}
          />
        )}
        {loading ?
          <FillLoading/> :
          groups.length > 0 ? 
          <div className="driver-group-list">
            {sortedGroups
              .filter(g => g._id !== selected) // Remove the selected group from the array.
              .map((driverGroup: driverGroupType, i: number) => // Map through all of the groups available.
              <DriverGroupCard
                key={i}
                group={driverGroup}
                canEdit={!!canEditGroup(driverGroup, user)}
                onEditClicked={() => {
                  setGroup(driverGroup)
                  setIsEdit(!isEdit)
                }}
                onClick={() => {
                  setSelected(driverGroup._id!)
                  setForm(prevForm => {
                    return {
                      ...prevForm,
                      driverGroup,
                    }
                  })
                }}
              />
            )}
          </div> :
          <div className="driver-group-empty">
            {backendErr.message ? 
              <p className="driver-group-error">{backendErr.message}</p> : 
              <p>No Driver Groups found... That may be a problem.</p>
            }
          </div>
        }
      </div>
      <AddButton
        style={style}
        onClick={() => setIsEdit(!isEdit)}
        absolute
      />
      {stepperBtns}
    </div>
  )
}

export default DriverGroupPicker
