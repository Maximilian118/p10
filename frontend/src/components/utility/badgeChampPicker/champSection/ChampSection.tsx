import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../icon/imageIcon/ImageIcon"
import { userChampSnapshotType, userProfileType } from "../../../../shared/types"
import { userBadgeSnapshotType, userType } from "../../../../shared/localStorage"
import './_champSection.scss'
import ChampQuickStats from "../champQuickStats/ChampQuickStats"
import ChampBannerStats from "../../../../page/Championship/components/ChampBannerStats/ChampBannerStats"
import { buildChampBannerStatsFromSnapshot } from "../../../../page/Championship/champUtility"
import Badge from "../../badge/Badge"
import BadgeInfoCard from "../../../cards/badgeInfoCard/BadgeInfoCard"

interface ChampSectionProps {
  user: userType | userProfileType
  champ: userChampSnapshotType
  onBadgeClick?: (badge: userBadgeSnapshotType, champId: string) => void
  activeBadge?: userBadgeSnapshotType | null
  isOpen?: boolean
}

const ChampSection: React.FC<ChampSectionProps> = ({ user, champ, onBadgeClick, activeBadge, isOpen }) => {
  const navigate = useNavigate()
  // Delayed isOpen state to allow component to mount before animating open.
  const [delayedIsOpen, setDelayedIsOpen] = useState(false)

  // Delay isOpen by one frame so component mounts with closed state first, enabling animation.
  useEffect(() => {
    if (activeBadge && isOpen) {
      const frame = requestAnimationFrame(() => {
        setDelayedIsOpen(true)
      })
      return () => cancelAnimationFrame(frame)
    } else {
      setDelayedIsOpen(false)
    }
  }, [activeBadge, isOpen])

  // Filter user's badges to get those earned from this championship, sorted by rarity (Mythic first)
  const earnedBadges = user.badges
    .filter(badge => badge.championship === champ._id)
    .sort((a, b) => b.rarity - a.rarity)

  // Navigates to the championship details page (disabled if champ is deleted)
  const handleChampClick = () => {
    if (!champ.deleted) {
      navigate(`/championship/${champ._id}`)
    }
  }

  return (
    <div className={`champ-section ${champ.deleted ? 'deleted' : ''}`}>
      <div className="champ-section-header" onClick={handleChampClick}>
        <ImageIcon src={champ.icon} size="large"/>
        <ChampQuickStats champ={champ}/>
        <div className="champ-section-info">
          <h5 className="champ-name">{champ.name}</h5>
          <ChampBannerStats stats={buildChampBannerStatsFromSnapshot(champ)}/>
        </div>
      </div>
      {activeBadge && (
        <BadgeInfoCard badge={activeBadge} isOpen={delayedIsOpen} />
      )}
      {earnedBadges.length > 0 ? (
        <div className="champ-badges-grid">
          {earnedBadges.map(badge => (
            <Badge
              key={badge._id}
              badge={badge}
              zoom={badge.zoom}
              showEditButton={false}
              onClick={(e) => {
                e.stopPropagation()
                onBadgeClick?.(badge, champ._id)
              }}
            />
          ))}
        </div>
      ) : <p className="no-badges">No badges earned</p>}
    </div>
  )
}

export default ChampSection
