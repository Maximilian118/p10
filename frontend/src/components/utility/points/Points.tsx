import React from "react"
import './_points.scss'
import { getPodiumClass } from "../../../shared/utility"

interface PointsType {
  total: number // totalPoints
  last?: number // How many points did were aquired from last round?
  position?: number // What's the current position of x in the championship?
}

const Points: React.FC<PointsType> = ({ total, last, position }) => {
  // Only apply podium class if points exist.
  const podiumClass = total > 0 ? getPodiumClass(position ?? 0) : ''

  return (
    <div className="points-container">
      {(last ?? 0) > 0 && <p className="last">+{last}</p>}
      <p className={`total ${podiumClass}`}>{total}</p>
      <p className="pts">pts</p>
    </div>
  )
}

export default Points
