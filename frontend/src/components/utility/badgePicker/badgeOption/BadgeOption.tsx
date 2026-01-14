import React from "react"
import "./_badgeOption.scss"
import { getBadgeColour } from "../../badge/badgeOverlay/BadgeOverlay"

interface BadgeOptionProps {
  name: string // Catchy display name
  awardedDesc: string // Long description
  rarity: number // 0-5
}

// Array of rarity labels matching the rarity scale.
const rarityLabels = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]

// Custom badge option component for MUI Autocomplete.
// Displays badge name (bold), description (smaller), and rarity indicator.
const BadgeOption = ({ name, awardedDesc, rarity }: BadgeOptionProps) => {
  const rarityLabel = rarityLabels[rarity] || "Common"
  const rarityColour = getBadgeColour(rarity)

  return (
    <div className="badge-option">
      <div className="badge-option-left">
        <span className="badge-option-name">{name}</span>
        <span className="badge-option-desc">{awardedDesc}</span>
      </div>
      <div className="badge-option-right">
        <span className="badge-option-rarity">{rarityLabel}</span>
        <span
          className="badge-option-dot"
          style={{ backgroundColor: rarityColour }}
        />
      </div>
    </div>
  )
}

export default BadgeOption
