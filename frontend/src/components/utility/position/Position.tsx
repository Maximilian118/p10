import React from "react"
import './_position.scss'
import { getPodiumClass } from "../../../shared/utility"
import moment from "moment"

interface PositionProps {
  position: number // What's the current position of x in the championship?
  season?: number // What season is the championship in currently?
  change?: number | null // Position change: positive = moved up, negative = moved down.
}

const Position: React.FC<PositionProps> = ({ position, season, change }) => {
  const podiumClass = getPodiumClass(position)

  // Format change: "+2" for gains, "-2" for drops.
  const changeText = change && change > 0 ? `+${change}` : `${change}`
  const lostClass = change && change < 0 ? "lost" : ""

  return (
    <div className="position-container">
      {/* Only render if there's actual movement. */}
      {change !== undefined && change !== null && change !== 0 && (
        <p className={`change ${lostClass}`}>{changeText}</p>
      )}
      <p className={`position ${podiumClass}`}>{moment.localeData().ordinal(position)}</p>
      <p className="season">{`S${season}`}</p>
    </div>
  )
}

export default Position
