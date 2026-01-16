import React from "react"
import "./_badgeInfoCard.scss"
import { badgeType } from "../../../shared/types"
import Badge from "../../utility/badge/Badge"

interface BadgeInfoCardProps {
  badge: badgeType | null
  isOpen: boolean
}

// Placeholder text for hidden badges.
const HIDDEN_BADGE_TITLE = "Hidden badge"
const HIDDEN_BADGE_DESC = "Someone must earn this badge before you can see how to obtain it!"

// Displays badge details with smooth height animation when a badge is selected.
const BadgeInfoCard: React.FC<BadgeInfoCardProps> = ({ badge, isOpen }) => {
  // Check if badge is hidden (no URL means unearned and hidden from non-adjudicators).
  const isHidden = badge && !badge.url && !badge.previewUrl

  // Determine display name - use hidden placeholder if badge is hidden.
  const displayName = isHidden
    ? HIDDEN_BADGE_TITLE
    : (badge?.customName || badge?.name || "")

  // Determine description - use hidden placeholder if badge is hidden.
  const displayDesc = isHidden
    ? HIDDEN_BADGE_DESC
    : badge?.awardedDesc

  return (
    <div className={`badge-info-card-wrapper ${isOpen ? 'badge-info-card-wrapper--open' : ''}`}>
      <div className="badge-info-card">
        {badge && (
          <div className="badge-info-header">
            <Badge badge={badge} zoom={badge.zoom} />
            <div className="badge-info">
              <span className={`badge-info-name ${isHidden ? 'badge-info-name--hidden' : ''}`}>
                {displayName}
              </span>
              <p className={isHidden ? 'badge-info-desc--hidden' : ''}>
                {displayDesc}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BadgeInfoCard
