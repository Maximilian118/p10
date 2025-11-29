import React from "react"
import './_badgeSpinner.scss'

interface badgeSpinnerType {
  thickness?: number
  style?: {}
}

const BadgeSpinner: React.FC<badgeSpinnerType> = ({ thickness, style }) => (
  <div 
    className="badge-spinner" 
    style={{ 
      borderTop: `${thickness ? thickness : 2}px solid rgba(255, 255, 255, 0.4)`,
      borderBottom: `${thickness ? thickness : 2}px solid rgba(255, 255, 255, 0.4)`,
      borderLeft: `${thickness ? thickness : 2}px solid transparent`,
      borderRight: `${thickness ? thickness : 2}px solid transparent`,
      ...style
    }}
  />
)

export default BadgeSpinner
