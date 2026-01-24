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
  isKicked?: boolean
  isInactive?: boolean
  onBanClick?: () => void
  onUnbanClick?: () => void
  onKickClick?: () => void
  onInviteClick?: () => void
  onPointsChange?: (change: number) => void
}


// Card component for displaying a competitor in a list.
const CompetitorListCard: React.FC<competitorListCardType> = ({
  entry,
  onClick,
  highlight,
  adjudicatorView,
  isBanned,
  isKicked,
  isInactive,
  onBanClick,
  onUnbanClick,
  onKickClick,
  onInviteClick,
  onPointsChange
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

  // Handle kick button click - stop propagation to prevent card click.
  const handleKickClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onKickClick?.()
  }

  // Handle invite button click - stop propagation to prevent card click.
  const handleInviteClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onInviteClick?.()
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
      <Points
        total={entry.grandTotalPoints}
        last={entry.grandTotalPoints - (entry.totalPoints - entry.points)}
        position={entry.position}
        canEdit={adjudicatorView}
        onPointsChange={onPointsChange}
      />
      <p className="competitor-name">{entry.competitor.name}</p>

      {/* Inactive badge for left/kicked/banned competitors (not banned/kicked in adjudicator view) */}
      {isInactive && !(adjudicatorView && (isBanned || isKicked)) && (
        <StatusLabel
          text={isBanned ? "BANNED" : isKicked ? "KICKED" : "LEFT"}
          colour={isBanned ? "error" : "default"}
        />
      )}

      {/* Kick and Ban buttons in adjudicator view (only for active competitors) */}
      {adjudicatorView && !isBanned && !isKicked && !isInactive && (
        <>
          <Button
            variant="contained"
            size="small"
            onClick={handleKickClick}
            className="kick-button"
          >
            Kick
          </Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            onClick={handleBanClick}
            className="ban-button"
          >
            Ban
          </Button>
        </>
      )}

      {adjudicatorView && isKicked && (
        <Button
          variant="contained"
          size="small"
          onClick={handleInviteClick}
          className="invite-button"
        >
          Invite
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
