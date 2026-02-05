import React from "react"
import './_position.scss'
import { getPodiumClass } from "../../../shared/utility"
import moment from "moment"
import StyledText, { StyledTextColour } from "../styledText/StyledText"

interface PositionProps {
  position: number // What's the current position of x in the championship?
  season?: number // What season is the championship in currently?
  change?: number | null // Position change: positive = moved up, negative = moved down.
}

const Position: React.FC<PositionProps> = ({ position, season, change }) => {
  const ordinalText = moment.localeData().ordinal(position)

  // Map podium class to StyledText color (empty string becomes "default").
  const podiumClass = getPodiumClass(position)
  const color: StyledTextColour = podiumClass ? podiumClass as StyledTextColour : "default"

  // Format change: "+2" for gains, "-2" for drops.
  const changeText = change && change > 0 ? `+${change}` : `${change}`
  const lostClass = change && change < 0 ? "lost" : ""

  return (
    <div className="position-container">
      {/* Only render if there's actual movement. */}
      {change !== undefined && change !== null && change !== 0 && (
        <p className={`change ${lostClass}`}>{changeText}</p>
      )}
      <p className="position">
        <StyledText text={ordinalText} color={color}/>
      </p>
      {season !== undefined && <p className="season">{`S${season}`}</p>}
    </div>
  )
}

export default Position
