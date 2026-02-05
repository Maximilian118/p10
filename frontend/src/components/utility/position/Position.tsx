import React from "react"
import './_position.scss'
import { getPodiumClass } from "../../../shared/utility"
import moment from "moment"
import StyledText, { StyledTextColour } from "../styledText/StyledText"

interface PositionProps {
  position: number // What's the current position of x in the championship?
  season?: number // What season is the championship in currently?
  change?: number | null // Position change: positive = moved up, negative = moved down.
  isBest?: boolean // Show "Best!" indicator below position instead of season.
  points?: number // Show "+X" points above position instead of change.
}

const Position: React.FC<PositionProps> = ({ position, season, change, isBest, points }) => {
  const ordinalText = moment.localeData().ordinal(position)

  // Map podium class to StyledText color (empty string becomes "default").
  const podiumClass = getPodiumClass(position)
  const color: StyledTextColour = podiumClass ? podiumClass as StyledTextColour : "default"

  // Format change: "+2" for gains, "-2" for drops.
  const changeText = change && change > 0 ? `+${change}` : `${change}`
  const lostClass = change && change < 0 ? "lost" : ""

  return (
    <div className="position-container">
      {/* Top slot: round points or position change. */}
      {points ? (
        <p className="points">{`+${points}`}</p>
      ) : change !== undefined && change !== null && change !== 0 && (
        <p className={`change ${lostClass}`}>{changeText}</p>
      )}
      <p className="position">
        <StyledText text={ordinalText} color={color}/>
      </p>
      {/* Bottom slot: "Best!" indicator or season number. */}
      {isBest ? (
        <p className="best">Best!</p>
      ) : season !== undefined && <p className="season">{`S${season}`}</p>}
    </div>
  )
}

export default Position
