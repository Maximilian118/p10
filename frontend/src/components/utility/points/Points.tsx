import React from "react"
import './_points.scss'

interface PointsType {
  total: number // totalPoints
  last?: number // How many points did were aquired from last round?
  position?: number // What's the current position of x in the championship?
}

const Points: React.FC<PointsType> = ({ total, last, position }) => {
  // Determine podium class based on position (only if points exist).
  const getPodiumClass = () => {
    if (total <= 0) return ''
    if (position === 1) return 'gold'
    if (position === 2) return 'silver'
    if (position === 3) return 'bronze'
    return ''
  }

  return (
    <div className="points-container">
      {(last ?? 0) > 0 && <p className="last">+{last}</p>}
      <p className={`total ${getPodiumClass()}`}>{total}</p>
      <p className="pts">pts</p>
    </div>
  )
}

export default Points
