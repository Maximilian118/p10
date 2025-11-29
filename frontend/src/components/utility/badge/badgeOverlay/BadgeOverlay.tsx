import React from "react"
import './_badgeOverlay.scss'
import BadgeSpinner from "./badgeSpinner/BadgeSpinner"
import Shimmer from "./shimmer/Shimmer"

interface badgeOverlayType {
  rarity: number
  thickness?: number
  error?: boolean
  style?: {}
}

export const getBadgeColour = (rarity: number, error?: boolean): string => {
  if (error) {
    return "#d32f2f" // Error
  }

  switch (rarity) {
    case 0: return "#9d9d9d" // Common
    case 1: return "#967969" // Uncommon
    case 2: return "#66bb6a" // Rare
    case 3: return "#3080d0" // Epic
    case 4: return "#DA70D6" // Legendary
    case 5: return "#FFC000" // Mythic
    default: return "#C0C0C0"
  }
}

const BadgeOverlay: React.FC<badgeOverlayType> = ({ rarity, thickness, error, style }) => {
  return (
    <>
      {!error && rarity === 5 && <Shimmer style={style}/>}
      {!error && rarity >= 4 && <BadgeSpinner thickness={thickness ? thickness : 2} style={style}/>}
      <div className="badge-outer" style={{ border: `${thickness ? thickness : 6}px solid ${getBadgeColour(rarity, error)}`, opacity: 0.9, ...style }}>
        <div className="badge-middle" style={{ border: `${thickness ? thickness / 2 : 4}px solid ${getBadgeColour(rarity, error)}`, opacity: 0.6, ...style }}>
          <div className="badge-inner" style={{ border: `${thickness ? thickness / 4 : 2}px solid ${getBadgeColour(rarity, error)}`, opacity: 0.5, ...style }} />
        </div>
      </div>
    </>
  )
}

export default BadgeOverlay
