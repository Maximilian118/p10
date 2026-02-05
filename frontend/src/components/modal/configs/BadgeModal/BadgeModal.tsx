import React from "react"
import Modal from "../../Modal"
import Badge from "../../../utility/badge/Badge"
import { badgeType, userBadgeSnapshotType } from "../../../../shared/types"
import "./_badge-modal.scss"

interface BadgeModalProps {
  badge: badgeType | userBadgeSnapshotType
  onClose: () => void
}

// Badge detail modal - displays badge info without confetti (used in results view).
const BadgeModal: React.FC<BadgeModalProps> = ({ badge, onClose }) => {
  return (
    <Modal onClose={onClose}>
      {/* Badge display with pop animation */}
      <div className="badge-modal__badge">
        <Badge badge={badge} zoom={badge.zoom} overlayThickness={10}/>
      </div>

      {/* Badge name - prefer custom name over default */}
      <h2 className="badge-modal__name">
        {badge.customName || badge.name}
      </h2>

      {/* Badge description */}
      <p className="badge-modal__description">
        {badge.awardedDesc}
      </p>

      {/* Close instruction hint */}
      <p className="badge-modal__close-hint">
        Click anywhere to close
      </p>
    </Modal>
  )
}

export default BadgeModal
