import React, { useEffect, useState } from "react"
import './_badgePicker.scss'
import { badgeType } from "../../../shared/types"
import Badge from "../badge/Badge"
import BadgePickerEdit, { BadgePickerEditRef } from "./badgePickerEdit/BadgePickerEdit"
import { getBadgesByChamp } from "../../../shared/requests/badgeRequests"
import { userType } from "../../../shared/localStorage"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { Button, CircularProgress } from "@mui/material"
import { FilterList } from "@mui/icons-material"
import BadgeFilterDraw from "./badgeFilterDraw/BadgeFilterDraw"
import { badgeRarities, badgeRarityType } from "../../../shared/badgeOutcomes"
import { useNavigate } from "react-router-dom"
import ButtonBar from "../buttonBar/ButtonBar"
import AddButton from "../button/addButton/AddButton"

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
  onEditHandlersReady?: (handlers: BadgePickerEditRef) => void // Callback to expose edit handlers.
  championship?: string // Championship ID for badge association.
  onBadgeClick?: (badge: badgeType) => void // Callback when a badge is clicked in read-only mode.
  defaultsButton?: boolean // Show "Add/Remove defaults" button in filter drawer.
  hideFilterDraw?: boolean // Hides the internal filter drawer (when parent renders it at a higher level).
  filtered?: number[] // Controlled filter state from parent.
  setFiltered?: React.Dispatch<React.SetStateAction<number[]>> // Controlled filter setter from parent.
  onDefaultsReady?: (defaults: badgeType[]) => void // Callback to expose defaults to parent.
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
  onBadgeClick,
  defaultsButton,
  hideFilterDraw = false,
  filtered: controlledFiltered,
  setFiltered: controlledSetFiltered,
  onDefaultsReady,
}: badgePickerType<T>) => {
  // Support both controlled and uncontrolled state patterns.
  const [ internalIsEdit, setInternalIsEdit ] = useState<boolean | badgeType>(false)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ internalDraw, setInternalDraw ] = useState<boolean>(false)
  const [ defaults, setDefaults ] = useState<badgeType[]>(defaultBadges ? defaultBadges : [])
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ internalFiltered, setInternalFiltered ] = useState<number[]>(badgeRarities().map((rarity: badgeRarityType) => rarity.rarity))

  // Use controlled state if provided, otherwise use internal state.
  const isEdit = controlledIsEdit !== undefined ? controlledIsEdit : internalIsEdit
  const setIsEdit = controlledSetIsEdit !== undefined ? controlledSetIsEdit : setInternalIsEdit
  const draw = controlledDraw !== undefined ? controlledDraw : internalDraw
  const setDraw = controlledSetDraw !== undefined ? controlledSetDraw : setInternalDraw
  const filtered = controlledFiltered !== undefined ? controlledFiltered : internalFiltered
  const setFiltered = controlledSetFiltered !== undefined ? controlledSetFiltered : setInternalFiltered

  const navigate = useNavigate()

  // Fetch badges on mount - either for a specific championship or default badges.
  // Check for url field to determine if we have full badge data (not just minimal stat data).
  const hasFullBadgeData = form.champBadges.length > 0 && form.champBadges[0]?.url
  useEffect(() => {
    if (!hasFullBadgeData && !reqSent && !badgesReqSent) {
      setReqSent(true) // Local state to ensure req doesn't send twice.
      if (setBadgesReqSent) setBadgesReqSent(true) // Remote state to ensure req doesn't send again even if component unloads and reloads.
      // If championship ID provided, fetch badges for that championship. Otherwise fetch default badges.
      getBadgesByChamp(championship || null, user, setUser, navigate, setLoading, setBackendErr, setForm, setDefaults, setDefaultBadges)
    }
  }, [hasFullBadgeData, user, setUser, navigate, setBackendErr, setForm, reqSent, badgesReqSent, setBadgesReqSent, defaults, setDefaultBadges, championship])

  // Notify parent when defaults are loaded so parent can pass them to BadgeFilterDraw.
  useEffect(() => {
    if (defaults.length > 0 && onDefaultsReady) {
      onDefaultsReady(defaults)
    }
  }, [defaults, onDefaultsReady])

  // Filter by selected rarities and sort from most rare (5=Mythic) to least rare (0=Common).
  const badgesFiltered = form.champBadges
    .filter((badge) => filtered.includes(badge.rarity))
    .sort((a, b) => b.rarity - a.rarity)

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
            <div key={i} className="badge-item" onClick={(e) => e.stopPropagation()}>
              <Badge badge={badge} zoom={badge.zoom} onClick={() => {
                // Badge is hidden if it has no url (backend filters based on adjCanSeeBadges setting).
                const isHidden = !badge.url && !badge.previewUrl
                // If readOnly OR badge is hidden from this user, show info card instead of edit mode.
                if (readOnly || isHidden) {
                  onBadgeClick?.(badge)
                } else {
                  setIsEdit(badge)
                }
              }} showEditButton={!readOnly && (!!badge.url || !!badge.previewUrl)}/>
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
        <ButtonBar>
          <div className="button-group">
            <Button variant="contained" size="small" endIcon={<FilterList />} onClick={(e) => { e.stopPropagation(); setDraw(!draw) }}>
              Filter
            </Button>
            <AddButton onClick={() => setIsEdit(true)}/>
          </div>
        </ButtonBar>
      )}
      {!hideFilterDraw && (
        <BadgeFilterDraw
          draw={draw}
          setDraw={setDraw}
          form={form}
          setForm={setForm}
          defaults={defaults}
          filtered={filtered}
          setFiltered={setFiltered}
          defaultsButton={defaultsButton}
        />
      )}
    </div>
  )
}

export default BadgePicker


