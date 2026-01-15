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
  readOnly?: boolean // Hides toolbar and disables badge click for non-adjudicators.
  hideToolbar?: boolean // Hides the internal toolbar (when parent provides toolbar).
  isEdit?: boolean | badgeType // Controlled edit state from parent.
  setIsEdit?: React.Dispatch<React.SetStateAction<boolean | badgeType>> // Controlled edit setter from parent.
  draw?: boolean // Controlled filter drawer state from parent.
  setDraw?: React.Dispatch<React.SetStateAction<boolean>> // Controlled filter drawer setter from parent.
  onEditHandlersReady?: (handlers: { submit: () => Promise<void>, delete: () => Promise<void>, loading: boolean, isNewBadge: boolean }) => void // Callback to expose edit handlers.
  championship?: string // Championship ID for badge association.
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
  readOnly = false,
  hideToolbar = false,
  isEdit: controlledIsEdit,
  setIsEdit: controlledSetIsEdit,
  draw: controlledDraw,
  setDraw: controlledSetDraw,
  onEditHandlersReady,
  championship,
}: badgePickerType<T>) => {
  // Support both controlled and uncontrolled state patterns.
  const [ internalIsEdit, setInternalIsEdit ] = useState<boolean | badgeType>(false)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ internalDraw, setInternalDraw ] = useState<boolean>(false)
  const [ defaults, setDefaults ] = useState<badgeType[]>(defaultBadges ? defaultBadges : [])
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ filtered, setFiltered ] = useState<number[]>(badgeRarities().map((rarity: badgeRarityType) => rarity.rarity))

  // Use controlled state if provided, otherwise use internal state.
  const isEdit = controlledIsEdit !== undefined ? controlledIsEdit : internalIsEdit
  const setIsEdit = controlledSetIsEdit !== undefined ? controlledSetIsEdit : setInternalIsEdit
  const draw = controlledDraw !== undefined ? controlledDraw : internalDraw
  const setDraw = controlledSetDraw !== undefined ? controlledSetDraw : setInternalDraw

  const navigate = useNavigate()

  // Fetch badges on mount - either for a specific championship or default badges.
  useEffect(() => {
    if (form.champBadges.length === 0 && !reqSent && !badgesReqSent) {
      setReqSent(true) // Local state to ensure req doesn't send twice.
      if (setBadgesReqSent) setBadgesReqSent(true) // Remote state to ensure req doesn't send again even if component unloads and reloads.
      // If championship ID provided, fetch badges for that championship. Otherwise fetch default badges.
      getBadgesByChamp(championship || null, user, setUser, navigate, setLoading, setBackendErr, setForm, setDefaults, setDefaultBadges)
    }
  }, [form, user, setUser, navigate, setBackendErr, setForm, reqSent, badgesReqSent, setBadgesReqSent, defaults, setDefaultBadges, championship])

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
      backendErr={backendErr}
      setBackendErr={setBackendErr}
      championship={championship}
      embedded={!hideToolbar}
      onHandlersReady={onEditHandlersReady}
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
              <Badge badge={badge} zoom={badge.zoom} onClick={readOnly ? undefined : () => setIsEdit(badge)}/>
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
      {!readOnly && !hideToolbar && (
        <BadgePickerToolbar
          setIsEdit={setIsEdit}
          draw={draw}
          setDraw={setDraw}
        />
      )}
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


