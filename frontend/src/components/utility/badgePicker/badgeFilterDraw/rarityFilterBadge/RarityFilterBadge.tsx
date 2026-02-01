import React, { MouseEvent } from "react"
import { Check } from "@mui/icons-material"
import { badgeRarityType } from "../../../../../shared/badgeOutcomes"
import { getBadgeColour } from "../../../badge/badgeOverlay/badgeOverlayUtility"
import "./_rarityFilterBadge.scss"

interface RarityFilterBadgeProps {
  rarity: badgeRarityType
  active: boolean
  onClick: (e: MouseEvent) => void
}

// Darkens a hex color by a percentage for the inner background.
const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent))
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent))
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// Badge-styled toggle for filtering by rarity tier.
const RarityFilterBadge: React.FC<RarityFilterBadgeProps> = ({ rarity, active, onClick }) => {
  const color = getBadgeColour(rarity.rarity)
  const darkColor = darkenColor(color, 0.2)

  return (
    <button
      className={`rarity-filter-badge ${active ? "rarity-filter-badge--active" : "rarity-filter-badge--inactive"}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
      aria-label={`Filter ${rarity.rarityName} badges`}
    >
      <div
        className="rarity-filter-badge__ring"
        style={active ? { borderColor: color } : undefined}
      />
      <div
        className="rarity-filter-badge__inner"
        style={active ? { backgroundColor: darkColor } : undefined}
      >
        <Check className="rarity-filter-badge__tick" />
      </div>
    </button>
  )
}

export default RarityFilterBadge
