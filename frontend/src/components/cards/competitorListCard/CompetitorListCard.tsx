import React, { SyntheticEvent, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@mui/material"
import './_competitorListCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { CompetitorEntryType } from "../../../shared/types"
import Points from "../../utility/points/Points"
import StatusLabel from "../../utility/statusLabel/StatusLabel"
import FeaturedBadges from "../../utility/featuredBadges/FeaturedBadges"
import Banner from "../../utility/banner/Banner"

interface competitorListCardType {
  entry: CompetitorEntryType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
  adjudicatorView?: boolean
  isBanned?: boolean
  isKicked?: boolean
  isInactive?: boolean
  isDeleted?: boolean
  isSelf?: boolean
  isAdjudicator?: boolean
  isAdmin?: boolean
  onBanClick?: () => void
  onUnbanClick?: () => void
  onKickClick?: () => void
  onInviteClick?: () => void
  onPromoteClick?: () => void
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
  isDeleted,
  isSelf,
  isAdjudicator,
  onBanClick,
  onUnbanClick,
  onKickClick,
  onInviteClick,
  onPromoteClick,
  onPointsChange
}) => {
  const navigate = useNavigate()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // State for adjudicator drawer visibility.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // State for responsive badge sizing.
  const [isNarrowViewport, setIsNarrowViewport] = useState(window.innerWidth < 420)

  // Extract display data - use snapshot for deleted users.
  const competitorId = entry.competitor?._id ?? entry.deletedUserSnapshot?._id
  const competitorName = entry.competitor?.name ?? entry.deletedUserSnapshot?.name ?? "Deleted User"
  const competitorIcon = entry.competitor?.icon ?? entry.deletedUserSnapshot?.icon ?? ""
  const competitorBadges = entry.competitor?.badges

  // Determine if competitor is active (not banned, kicked, inactive, or deleted).
  const isActive = !isBanned && !isKicked && !isInactive && !isDeleted

  // Handle click outside to close drawer.
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDrawerOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isDrawerOpen])

  // Update viewport state on resize for responsive badge sizing.
  useEffect(() => {
    const handleResize = () => setIsNarrowViewport(window.innerWidth < 420)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle card click - toggle drawer in adjudicator view, otherwise navigate to profile.
  const handleClick = (e: SyntheticEvent) => {
    // In adjudicator view, never navigate to profile.
    if (adjudicatorView) {
      // Active non-self competitors toggle the drawer.
      if (isActive && !isSelf) {
        setIsDrawerOpen(prev => !prev)
      }
      // All other cases (self, inactive) do nothing.
      return
    }

    // Normal view: navigate to profile (only if competitor exists).
    if (onClick) {
      onClick(e)
    } else if (competitorId) {
      navigate(`/profile/${competitorId}`)
    }
  }

  // Handle options button click - toggle drawer.
  const handleOptionsClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    setIsDrawerOpen(prev => !prev)
  }

  // Handle unban button click - stop propagation to prevent card click.
  const handleUnbanClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onUnbanClick?.()
  }

  // Handle invite button click - stop propagation to prevent card click.
  const handleInviteClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    onInviteClick?.()
  }

  // Returns status label props for inactive/deleted competitors.
  const getInactiveStatus = (): { text: string; colour: "default" | "error" } => {
    if (isDeleted) return { text: "DELETED", colour: "error" }
    if (isBanned) return { text: "BANNED", colour: "error" }
    if (isKicked) return { text: "KICKED", colour: "default" }
    return { text: "LEFT", colour: "default" }
  }

  // Build class name with optional modifiers.
  const classNames = [
    "competitor-list-card",
    highlight && "competitor-list-card__highlight",
    (isInactive || isDeleted) && "competitor-list-card--inactive",
    isDrawerOpen && adjudicatorView && isActive && !isSelf && "competitor-list-card--actions-open",
  ].filter(Boolean).join(" ")

  return (
    <div ref={wrapperRef} className={classNames} onClick={handleClick}>
      {isAdjudicator && <Banner text="Adjudicator"/>}
      <ImageIcon src={competitorIcon} size="x-large" />

      {/* Sliding area - contains points, name/options and action buttons */}
      <div className="competitor-list-card__slide-area">
        {/* Points - stays in place on large screens, slides on small screens */}
        <div className="competitor-list-card__points-wrapper">
          <Points
            total={entry.grandTotalPoints}
            last={entry.grandTotalPoints - (entry.totalPoints - entry.points)}
            position={entry.position}
            canEdit={adjudicatorView}
            onPointsChange={onPointsChange}
            color={entry.grandTotalPoints < 0 ? "error" : undefined}
          />
        </div>

        {/* Name section - always slides up out of view when actions open */}
        <div className="competitor-list-card__info-section">
          {/* Name row - contains name and action button on same line */}
          <div className="competitor-list-card__name-row">
            <p className="competitor-name">{competitorName}</p>

            {/* Options button for active competitors in adjudicator view (not for self) */}
            {adjudicatorView && isActive && !isSelf && (
              <Button
                variant="contained"
                size="small"
                onClick={handleOptionsClick}
                className="options-button"
              >
                Options
              </Button>
            )}

            {/* Invite button for kicked or left (inactive) competitors in adjudicator view */}
            {adjudicatorView && (isKicked || isInactive) && !isBanned && !isDeleted && (
              <Button
                variant="contained"
                size="small"
                onClick={handleInviteClick}
                className="invite-button"
              >
                Invite
              </Button>
            )}

            {/* Unban button for banned competitors in adjudicator view */}
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

            {/* Disabled Deleted button for deleted accounts in adjudicator view */}
            {adjudicatorView && isDeleted && (
              <Button
                variant="contained"
                size="small"
                disabled
                className="deleted-button"
              >
                Deleted
              </Button>
            )}
          </div>

          {/* Featured badges below name row */}
          {isActive && !adjudicatorView && competitorBadges && competitorBadges.length > 0 && (
            <FeaturedBadges
              badges={competitorBadges}
              badgeSize={isNarrowViewport ? 30 : 32}
              readOnly
            />
          )}

          {/* Inactive badge for left/kicked/banned/deleted competitors (not banned/kicked in adjudicator view) */}
          {(isInactive || isDeleted) && !(adjudicatorView && (isBanned || isKicked || isDeleted)) && (
            <StatusLabel {...getInactiveStatus()} />
          )}
        </div>

        {/* Action buttons - slide up into view when open (adjudicator view only) */}
        {adjudicatorView && isActive && !isSelf && (
          <div className="competitor-list-card__actions">
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={(e) => { e.stopPropagation(); onPromoteClick?.() }}
            >
              Promote
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={(e) => { e.stopPropagation(); onKickClick?.() }}
            >
              Kick
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={(e) => { e.stopPropagation(); onBanClick?.() }}
            >
              Ban
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompetitorListCard
