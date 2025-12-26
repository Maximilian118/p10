import React from "react"
import './_points.scss'

interface PointsType {
  total: number
  last?: number
  position?: number
}

const Points: React.FC<PointsType> = ({ total, last, position }) => {
  // Determine podium class based on position.
  const getPodiumClass = () => {
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
