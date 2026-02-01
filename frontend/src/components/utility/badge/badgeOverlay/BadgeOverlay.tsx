import React from "react"
import './_badgeOverlay.scss'
import BadgeSpinner from "./badgeSpinner/BadgeSpinner"
import Shimmer from "./shimmer/Shimmer"
import { getBadgeColour, getBadgeGlow } from "./badgeOverlayUtility"

interface badgeOverlayType {
  rarity: number
  thickness?: number
  error?: boolean
  style?: React.CSSProperties
}

const BadgeOverlay: React.FC<badgeOverlayType> = ({ rarity, thickness, error, style }) => {
  return (
    <>
      <div className="badge-outer" style={{ border: `${thickness ? thickness : 6}px solid ${getBadgeColour(rarity, error)}`, boxShadow: getBadgeGlow(rarity, error), opacity: 0.9, ...style }}>
        <div className="badge-middle" style={{ border: `${thickness ? thickness / 2 : 4}px solid ${getBadgeColour(rarity, error)}`, opacity: 0.6, ...style }}>
          <div className="badge-inner" style={{ border: `${thickness ? thickness / 4 : 2}px solid ${getBadgeColour(rarity, error)}`, opacity: 0.5, ...style }} />
        </div>
      </div>
      {!error && rarity >= 2 && <BadgeSpinner thickness={thickness ? thickness : 2} rarity={rarity} style={style}/>}
      {!error && rarity === 5 && <Shimmer style={style}/>}
    </>
  )
}

export default React.memo(BadgeOverlay)
