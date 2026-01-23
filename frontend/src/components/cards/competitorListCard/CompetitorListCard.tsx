import React, { SyntheticEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@mui/material"
import './_competitorListCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { CompetitorEntryType } from "../../../shared/types"
import Points from "../../utility/points/Points"
import StatusLabel from "../../utility/statusLabel/StatusLabel"

interface competitorListCardType {
  entry: CompetitorEntryType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
  adjudicatorView?: boolean
  isBanned?: boolean
  isInactive?: boolean
  onBanClick?: () => void
  onUnbanClick?: () => void
}

// Card component for displaying a competitor in a list.
const CompetitorListCard: React.FC<competitorListCardType> = ({
  entry,
  onClick,
  highlight,
  adjudicatorView,
  isBanned,
  isInactive,
  onBanClick,
  onUnbanClick,
}) => {
  const navigate = useNavigate()

  // Handle card click - navigate to profile or use custom handler.
  const handleClick = (e: SyntheticEvent) => {
    if (onClick) {
      onClick(e)
    } else {
      navigate(`/profile/${entry.competitor._id}`)
    }
  }

  // Handle ban button click - stop propagation to prevent card click.
  const handleBanClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onBanClick?.()
  }

  // Handle unban button click - stop propagation to prevent card click.
  const handleUnbanClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onUnbanClick?.()
  }

  // Build class name with optional modifiers.
  const classNames = [
    "competitor-list-card",
    highlight && "competitor-list-card__highlight",
    isInactive && "competitor-list-card--inactive",
  ].filter(Boolean).join(" ")

  return (
    <div className={classNames} onClick={handleClick}>
      <ImageIcon src={entry.competitor.icon} size="x-large" />
      <Points total={entry.totalPoints} last={entry.points} position={entry.position}/>
      <p className="competitor-name">{entry.competitor.name}</p>

      {/* Inactive badge for left competitors (not banned in adjudicator view) */}
      {isInactive && !(adjudicatorView && isBanned) && (
        <StatusLabel
          text={isBanned ? "BANNED" : "LEFT"}
          colour={isBanned ? "error" : "default"}
        />
      )}

      {/* Ban button in adjudicator view (only for active, non-banned competitors) */}
      {adjudicatorView && !isBanned && !isInactive && (
        <Button
          variant="contained"
          size="small"
          color="error"
          onClick={handleBanClick}
          className="ban-button"
        >
          Ban
        </Button>
      )}

      {/* Unban button in adjudicator view (for banned competitors) */}
      {adjudicatorView && isBanned && (
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={handleUnbanClick}
          className="unban-button"
        >
          Unban
        </Button>
      )}
    </div>
  )
}

export default CompetitorListCard
