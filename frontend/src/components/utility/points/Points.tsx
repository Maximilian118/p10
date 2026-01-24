import React from "react"
import './_points.scss'
import { getPodiumClass } from "../../../shared/utility"
import { ArrowDropDown, ArrowDropUp } from "@mui/icons-material"

interface PointsType {
  total: number // totalPoints
  last?: number // How many points did were aquired from last round?
  position?: number // What's the current position of x in the championship?
  canEdit?: boolean // Can the user increase or decrease the points shown?
  onPointsChange?: (change: number) => void // Emits +1 or -1 when adj clicks arrows
}

const Points: React.FC<PointsType> = ({ total, last, position, canEdit, onPointsChange }) => {
  // Handles click on up/down arrows, emits the change to parent
  const pointsClickedHandler = (e: React.MouseEvent, change: number) => {
    e.stopPropagation()
    onPointsChange?.(change)
  }

  const pointsDif = (last ?? 0) > 0 && <p className="last">+{last}</p>

  const top = !canEdit ? pointsDif : (
    <span className="add-points" onClick={e => pointsClickedHandler(e, 1)}>
      <ArrowDropUp/>
    </span>
  )
  const bottom = !canEdit ? <p className="pts">pts</p> : (
    <span className="remove-points" onClick={e => pointsClickedHandler(e, -1)}>
      <ArrowDropDown/>
    </span>
  )

  return (
    <div className="points-container">
      {top}
      <p className={`total ${total > 0 ? getPodiumClass(position ?? 0) : ''}`}>{total}</p>
      {bottom}
    </div>
  )
}

export default Points
