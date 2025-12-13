import React, { useEffect, useState } from "react"
import './_badgePicker.scss'
import BadgePickerToolbar from "./badgePickerToolbar/BadgePickerToolbar"
import { badgeType } from "../../../shared/types"
import Badge from "../badge/Badge"
import BadgePickerEdit from "./badgePickerEdit/BadgePickerEdit"
import { getBadgesByChamp } from "../../../shared/requests/badgeRequests"
import { userType } from "../../../shared/localStorage"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { CircularProgress } from "@mui/material"
import BadgeFilterDraw from "./badgeFilterDraw/BadgeFilterDraw"
import { badgeRarities, badgeRarityType } from "../../../shared/badges"
import { useNavigate } from "react-router-dom"

interface badgePickerType<T> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  badgesReqSent?: boolean
  setBadgesReqSent?: React.Dispatch<React.SetStateAction<boolean>>
  defaultBadges?: badgeType[]
  setDefaultBadges?: React.Dispatch<React.SetStateAction<badgeType[]>>
}

const BadgePicker = <T extends { champBadges: badgeType[] }>({
  form,
  setForm,
  user,
  setUser,
  backendErr,
  setBackendErr,
  badgesReqSent,
  setBadgesReqSent,
  defaultBadges,
  setDefaultBadges,
}: badgePickerType<T>) => {
  const [ isEdit, setIsEdit ] = useState<boolean | badgeType>(false) // Fill with badge info to edit or false to close BadgePickerEdit.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ draw, setDraw ] = useState<boolean>(false) // Open or close the filter draw.
  const [ defaults, setDefaults ] = useState<badgeType[]>(defaultBadges ? defaultBadges : []) // default badges from backend
  const [ reqSent, setReqSent ] = useState<boolean>(false) // Determine if getBadgesByChamp has been sent or not.
  const [ filtered, setFiltered ] = useState<number[]>(badgeRarities().map((rarity: badgeRarityType) => rarity.rarity))

  const navigate = useNavigate()

  // Send a request for default badges of first mount of the BadgePicker componenet.
  // Send a subsequent request if local reqSent state or if it exists non-local badgeReqSent state is true. 
  useEffect(() => {
    if (form.champBadges.length === 0 && !reqSent && !badgesReqSent) {
      setReqSent(true) // Local state to ensure req doesn't send twice.
      if (setBadgesReqSent) setBadgesReqSent(true) // Remote state to ensure req doesn't send again even if component unloads and reloads.
      getBadgesByChamp(null, user, setUser, navigate, setLoading, setBackendErr, setForm, setDefaults, setDefaultBadges) // Req
    }
  }, [form, user, setUser, navigate, setBackendErr, setForm, reqSent, badgesReqSent, setBadgesReqSent, defaults, setDefaultBadges])

  const badgesFiltered = form.champBadges.filter((badge) => filtered.includes(badge.rarity))

  return isEdit ?
    <BadgePickerEdit
      isEdit={isEdit}
      setIsEdit={setIsEdit}
      form={form}
      setForm={setForm}
      user={user}
      setUser={setUser}
      navigate={navigate}
    /> : (
    <div className="badge-picker">
      {loading ? 
        <div className="badge-picker-loading">
          <CircularProgress/>
        </div> : 
        badgesFiltered.length > 0 ?
        <div className="badge-list-container">
          {badgesFiltered.map((badge: badgeType, i: number) => (
            <div key={i} className="badge-item">
              <Badge badge={badge} zoom={badge.zoom} onClick={() => setIsEdit(badge)}/>
            </div>
          ))}      
        </div> :
        <div className="badge-list-empty">
          {backendErr.message ? 
            <p className="badge-list-error">{backendErr.message}</p> : 
            <p>{form.champBadges.length > 0 ? `You've filtered everything dummy...` : `No Badges? Boring...`}</p>
          }
        </div>
      }
      <BadgePickerToolbar
        setIsEdit={setIsEdit}
        draw={draw}
        setDraw={setDraw}
      />
      <BadgeFilterDraw
        draw={draw}
        setDraw={setDraw}
        form={form}
        setForm={setForm}
        defaults={defaults}
        filtered={filtered}
        setFiltered={setFiltered}
        defaultBadges={defaultBadges}
        setDefaultBadges={setDefaultBadges}
      />
    </div>
  )
}

export default BadgePicker


