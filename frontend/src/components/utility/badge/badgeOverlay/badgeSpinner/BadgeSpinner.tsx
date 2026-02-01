import React from "react"
import './_badgeSpinner.scss'

interface badgeSpinnerType {
  thickness?: number
  rarity?: number
  style?: React.CSSProperties
}

// Returns the CSS class modifier based on rarity
const getRarityClass = (rarity: number): string => {
  switch (rarity) {
    case 2: return 'badge-spinner--rare'
    case 3: return 'badge-spinner--epic'
    default: return ''
  }
}

// Renders a rotating spinner overlay for higher rarity badges
const BadgeSpinner: React.FC<badgeSpinnerType> = ({ thickness, rarity, style }) => {
  const borderWidth = thickness || 2
  const singleSegment = rarity === 2 || rarity === 3

  return (
    <div
      className={`badge-spinner ${getRarityClass(rarity || 4)}`}
      style={{
        borderTop: `${borderWidth}px solid rgba(255, 255, 255, 0.4)`,
        borderBottom: singleSegment ? `${borderWidth}px solid transparent` : `${borderWidth}px solid rgba(255, 255, 255, 0.4)`,
        borderLeft: `${borderWidth}px solid transparent`,
        borderRight: `${borderWidth}px solid transparent`,
        ...style
      }}
    />
  )
}

export default React.memo(BadgeSpinner)
