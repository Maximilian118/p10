import React, { useRef, useState, useLayoutEffect, useMemo } from "react"
import "./_competitorResultsCard.scss"
import { CompetitorEntryType, badgeType } from "../../../../../../shared/types"
import { getCompetitorIcon } from "../../../../../../shared/utility"
import ImageIcon from "../../../../../../components/utility/icon/imageIcon/ImageIcon"
import Position from "../../../../../../components/utility/position/Position"
import Badge from "../../../../../../components/utility/badge/Badge"

const BADGE_WIDTH = 42
const BADGE_GAP = 4

interface CompetitorResultsCardProps {
  entry: CompetitorEntryType
  roundPosition: number // Finishing position for this round (based on points).
  isBest: boolean
  onBadgeClick?: (badge: badgeType) => void
}

// Simplified competitor card for the results list (4th place and below).
// Shows icon, position, name, badges earned this round, and points.
const CompetitorResultsCard: React.FC<CompetitorResultsCardProps> = ({ entry, roundPosition, isBest, onBadgeClick }) => {
  const badgesRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)

  // Sort badges by rarity descending (rarest/Mythic first).
  const sortedBadges = useMemo(
    () => [...(entry.badgesAwarded || [])].sort((a, b) => b.rarity - a.rarity),
    [entry.badgesAwarded]
  )

  // Measure container width and calculate how many badges fit without clipping.
  useLayoutEffect(() => {
    const container = badgesRef.current
    if (!container) return

    const updateVisibleCount = () => {
      const width = container.clientWidth
      setVisibleCount(Math.floor((width + BADGE_GAP) / (BADGE_WIDTH + BADGE_GAP)))
    }

    updateVisibleCount()

    const observer = new ResizeObserver(updateVisibleCount)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="competitor-results-card">
      <ImageIcon src={getCompetitorIcon(entry)} size="large" />
      
      {/* Round finishing position. */}
      <div className="competitor-results-card__position">
        <Position position={roundPosition} isBest={isBest} points={entry.points} />
      </div>

      {/* Badges earned this round, sorted by rarity and capped to fit container. */}
      <div className="competitor-results-card__badges" ref={badgesRef}>
        {sortedBadges.slice(0, visibleCount).map(badge => (
          <Badge key={badge._id} badge={badge} zoom={badge.zoom || 100} showEditButton={false} onClick={() => onBadgeClick?.(badge)} />
        ))}
      </div>
    </div>
  )
}

export default CompetitorResultsCard
