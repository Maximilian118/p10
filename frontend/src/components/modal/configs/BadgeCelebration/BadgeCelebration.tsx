import React from "react"
import Modal from "../../Modal"
import Confetti from "../../Confetti/Confetti"
import Badge from "../../../utility/badge/Badge"
import { userBadgeSnapshotType } from "../../../../shared/types"
import "./_badge-celebration.scss"

interface BadgeCelebrationProps {
  badge: userBadgeSnapshotType
  onClose: () => void
}

// Badge celebration modal - displays a confetti-filled celebration when a badge is earned.
const BadgeCelebration: React.FC<BadgeCelebrationProps> = ({ badge, onClose }) => {
  return (
    <Modal onClose={onClose}>
      {/* Confetti animation with rarity-based color palette */}
      <Confetti rarity={badge.rarity} />

      {/* Badge display with pop animation */}
      <div className="badge-celebration__badge">
        <Badge badge={badge} zoom={badge.zoom} overlayThickness={10}/>
      </div>

      {/* Badge name - prefer custom name over default */}
      <h2 className="badge-celebration__name">
        {badge.customName || badge.name}
      </h2>

      {/* Badge description */}
      <p className="badge-celebration__description">
        {badge.awardedDesc}
      </p>

      {/* Close instruction hint */}
      <p className="badge-celebration__close-hint">
        Click anywhere to close
      </p>
    </Modal>
  )
}

export default BadgeCelebration
