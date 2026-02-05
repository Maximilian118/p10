import React from "react"
import './_points.scss'
import { getPodiumClass } from "../../../shared/utility"
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material"
import StyledText, { StyledTextColour } from "../styledText/StyledText"

interface PointsType {
  total: number // totalPoints
  last?: number // How many points did were aquired from last round?
  position?: number // What's the current position of x in the championship?
  canEdit?: boolean // Can the user increase or decrease the points shown?
  onPointsChange?: (change: number) => void // Emits +1 or -1 when adj clicks arrows
  color?: "default" | "success" | "error"
  darkMode?: boolean // Renders "pts" label in white for dark backgrounds.
}

const Points: React.FC<PointsType> = ({ total, last, position, canEdit, onPointsChange, color, darkMode }) => {
  // Handles click on up/down arrows, emits the change to parent
  const pointsClickedHandler = (e: React.MouseEvent, change: number) => {
    e.stopPropagation()
    onPointsChange?.(change)
  }

  const pointsDif = (last ?? 0) > 0 && <p className="last">+{last}</p>

  const top = !canEdit ? pointsDif : (
    <span className="add-points" onClick={e => pointsClickedHandler(e, 1)}>
      <KeyboardArrowUp/>
    </span>
  )
  const bottom = !canEdit ? <p className={`pts${darkMode ? " pts--dark" : ""}`}>pts</p> : (
    <span className="remove-points" onClick={e => pointsClickedHandler(e, -1)}>
      <KeyboardArrowDown/>
    </span>
  )

  // Determine StyledText color — explicit color prop overrides podium-based coloring.
  const podiumClass = total > 0 ? getPodiumClass(position ?? 0) : ""
  const resolvedColor: StyledTextColour = color ?? (podiumClass ? podiumClass as StyledTextColour : "default")

  return (
    <div className="points-container">
      {top}
      <p className="total">
        <StyledText text={total} color={resolvedColor} />
      </p>
      {bottom}
    </div>
  )
}

export default Points
