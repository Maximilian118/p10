import React from "react"
import "./_badgeInfoCard.scss"
import { badgeType } from "../../../shared/types"
import Badge from "../../utility/badge/Badge"

interface BadgeInfoCardProps {
  badge: badgeType | null
  isOpen: boolean
}

// Displays badge details with smooth height animation when a badge is selected.
const BadgeInfoCard: React.FC<BadgeInfoCardProps> = ({ badge, isOpen }) => {
  // Prefer customName if set, otherwise fall back to name.
  const displayName = badge?.customName || badge?.name || ""

  return (
    <div className={`badge-info-card-wrapper ${isOpen ? 'badge-info-card-wrapper--open' : ''}`}>
      <div className="badge-info-card">
        {badge && (
          <div className="badge-info-header">
            <Badge badge={badge} zoom={badge.zoom} />
            <div className="badge-info">
              <span className="badge-info-name">{displayName}</span>
              <p>{badge.awardedDesc}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BadgeInfoCard
