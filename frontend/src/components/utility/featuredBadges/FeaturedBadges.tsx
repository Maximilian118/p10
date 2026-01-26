import React from "react"
import "./_featuredBadges.scss"
import Badge from "../badge/Badge"
import BadgePlaceholder from "../badge/badgePlaceholder/BadgePlaceholder"
import { CircularProgress } from "@mui/material"
import { userBadgeSnapshotType } from "../../../shared/types"

interface FeaturedBadgesProps {
  badges: userBadgeSnapshotType[]            // Array of user badges to display in featured slots
  badgeSize: number                          // Size in pixels for badge dimensions (width and height)
  readOnly?: boolean                         // When true, all badge slots are non-interactive (not clickable)
  disabled?: boolean                         // When true, disables slot click interactions but maintains visual state
  blankSlots?: boolean                       // When true, empty slots maintain reserved space; when false, badges shift left
  placeholders?: boolean                     // When true, show BadgePlaceholder for empty slots; forced false when blankSlots is false
  selectedSlot?: number | null               // Slot position (1-6) to display selected visual state
  loadingSlot?: number | null                // 1-6: specific slot spinner, 0/null: none, other: all 6 spinners
  onSlotClick?: (position: number) => void   // Callback fired when a badge slot is clicked
  className?: string                         // Additional CSS classes for the container element
}

// Renders 6 featured badge slots with Badge or BadgePlaceholder based on badges array.
const FeaturedBadges: React.FC<FeaturedBadgesProps> = ({
  badges = [],
  badgeSize,
  readOnly = false,
  disabled = false,
  blankSlots = false,
  placeholders = false,
  selectedSlot,
  loadingSlot,
  onSlotClick,
  className,
}) => {
  // When blankSlots is false, placeholders must be false (badges shift left, no placeholders).
  const showPlaceholders = blankSlots ? placeholders : false

  // Determines if loadingSlot indicates "show all spinners" (any number not 0-6).
  const showAllSpinners = loadingSlot !== null && loadingSlot !== undefined && loadingSlot !== 0 && (loadingSlot < 1 || loadingSlot > 6)

  // Builds container class name with modifiers.
  const containerClass = [
    "featured-badges",
    disabled && "featured-badges--disabled",
    readOnly && "featured-badges--readonly",
    className,
  ].filter(Boolean).join(" ")

  // Renders a single slot at the given position.
  const renderSlot = (position: number) => {
    const featuredBadge = badges.find(b => b.featured === position)
    const isSelected = selectedSlot === position

    // Show spinner on this slot if loadingSlot matches position OR if showAllSpinners is true.
    if (showAllSpinners || loadingSlot === position) {
      return <CircularProgress key={position} size="small" />
    }

    // Read-only or disabled mode: render without click handlers.
    if (readOnly || disabled) {
      if (featuredBadge) {
        return <Badge key={position} badge={featuredBadge} zoom={featuredBadge.zoom} showEditButton={false} />
      }
      // If blankSlots is false and no badge, skip rendering this slot entirely.
      if (!blankSlots) return null
      // If showPlaceholders is true, render placeholder; otherwise render empty space.
      if (showPlaceholders) return <BadgePlaceholder key={position} position={position} size={badgeSize} />
      return <div key={position} style={{ width: badgeSize, height: badgeSize }} />
    }

    // Editable mode: render with click handlers.
    if (featuredBadge) {
      return (
        <div
          key={position}
          className={`featured-slot${isSelected ? " featured-slot--selected" : ""}`}
          onClick={() => onSlotClick?.(position)}
        >
          <Badge badge={featuredBadge} zoom={featuredBadge.zoom} showEditButton={false} />
        </div>
      )
    }

    // If blankSlots is false and no badge, skip rendering this slot entirely.
    if (!blankSlots) return null

    // If showPlaceholders is true, render clickable placeholder; otherwise render empty space.
    if (showPlaceholders) {
      return (
        <BadgePlaceholder
          key={position}
          position={position}
          size={badgeSize}
          isSelected={isSelected}
          onClick={() => onSlotClick?.(position)}
        />
      )
    }

    return <div key={position} style={{ width: badgeSize, height: badgeSize }} />
  }

  return (
    <div
      className={containerClass}
      style={{ "--badge-size": `${badgeSize}px` } as React.CSSProperties}
    >
      {[1, 2, 3, 4, 5, 6].map(renderSlot)}
    </div>
  )
}

export default FeaturedBadges
