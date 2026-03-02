import React, { useState } from "react"
import "./_badge.scss"
import { ContentProps } from "../types"
import ImageIcon from "../../../../utility/icon/imageIcon/ImageIcon"
import Badge from "../../../../utility/badge/Badge"
import { getBadgeColour } from "../../../../utility/badge/badgeOverlay/badgeOverlayUtility"
import BadgeModal from "../../../../modal/configs/BadgeModal/BadgeModal"
import { badgeRewardOutcomes } from "../../../../../shared/badgeOutcomes"

const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]

// Badge showcase content for badge_earned events.
const BadgeContent: React.FC<ContentProps> = ({ event, onUserClick }) => {
  const [showModal, setShowModal] = useState(false)
  const { payload } = event
  const rarity = payload.badgeRarity ?? 0
  const rarityName = RARITY_NAMES[rarity] ?? "Common"
  const rarityColour = getBadgeColour(rarity)

  // Look up the full description from badge outcomes using the awardedHow key.
  const outcome = badgeRewardOutcomes.find(o => o.awardedHow === payload.badgeAwardedHow)

  // Build a minimal badge object for the Badge component and modal.
  const badgeObj = { url: payload.badgeUrl ?? null, rarity, zoom: 100, name: payload.badgeName ?? null, awardedHow: payload.badgeAwardedHow ?? null, awardedDesc: outcome?.awardedDesc ?? null }

  return (
    <>
      <span className="social-event-card__rarity-tag" style={{ color: rarityColour, borderColor: rarityColour }}>
        {rarityName}
      </span>
      <div className="social-event-card__badge-showcase">
        <Badge badge={badgeObj} zoom={100} showEditButton={false} overlayThickness={3} style={{ width: 80, height: 80 }} onClick={() => setShowModal(true)} />
      </div>
      <div className="social-event-card__showcase-user" onClick={onUserClick}>
        <ImageIcon src={event.userSnapshot.icon} size="small" />
        <span className="social-event-card__showcase-name">{event.userSnapshot.name}</span>
      </div>
      <span className="social-event-card__showcase-sub">Earned the <strong>{payload.badgeName}</strong> badge</span>
      {showModal && <BadgeModal badge={badgeObj} onClose={() => setShowModal(false)} />}
    </>
  )
}

export default BadgeContent
