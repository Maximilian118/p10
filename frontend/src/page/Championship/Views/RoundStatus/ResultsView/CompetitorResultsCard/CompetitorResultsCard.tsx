import React from "react"
import "./_competitorResultsCard.scss"
import { CompetitorEntryType, badgeType } from "../../../../../../shared/types"
import { getCompetitorIcon } from "../../../../../../shared/utility"
import ImageIcon from "../../../../../../components/utility/icon/imageIcon/ImageIcon"
import Position from "../../../../../../components/utility/position/Position"
import Badge from "../../../../../../components/utility/badge/Badge"

interface CompetitorResultsCardProps {
  entry: CompetitorEntryType
  roundPosition: number // Finishing position for this round (based on points).
  isBest: boolean
  onBadgeClick?: (badge: badgeType) => void
}

// Simplified competitor card for the results list (4th place and below).
// Shows icon, position, name, badges earned this round, and points.
const CompetitorResultsCard: React.FC<CompetitorResultsCardProps> = ({ entry, roundPosition, isBest, onBadgeClick }) => {
  return (
    <div className="competitor-results-card">
      {/* Competitor icon with "Best!" overlay. */}
      <div className="competitor-results-card__icon-wrapper">
        {isBest && <span className="competitor-results-card__best">Best!</span>}
        <ImageIcon src={getCompetitorIcon(entry)} size="large" />
      </div>

      {/* Round finishing position. */}
      <div className="competitor-results-card__position">
        <Position position={roundPosition} />
      </div>

      {/* Badges earned this round. */}
      <div className="competitor-results-card__badges">
        {entry.badgesAwarded?.map(badge => (
          <Badge key={badge._id} badge={badge} zoom={badge.zoom || 100} showEditButton={false} onClick={() => onBadgeClick?.(badge)} />
        ))}
      </div>
    </div>
  )
}

export default CompetitorResultsCard
