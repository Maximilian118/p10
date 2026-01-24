import React, { forwardRef, useEffect, useMemo, useState } from "react"
import './_badgeChampPicker.scss'
import ChampSection from "./champSection/ChampSection"
import { userBadgeSnapshotType, userType } from "../../../shared/localStorage"
import { SelectionModeState } from "../../../shared/types"
import Badge from "../badge/Badge"
import { WorkspacePremium } from "@mui/icons-material"
import { Button } from "@mui/material"

interface BadgeChampPickerProps {
  user: userType
  selectionMode: SelectionModeState
  onBadgeSelect: (badgeId: string) => void
  onBadgeRemove: () => void
}

// Tracks selected badge and which championship it belongs to.
interface SelectedBadgeInfo {
  badge: userBadgeSnapshotType
  champId: string
}

// Badge picker component that displays badges organized by championship.
// In selection mode, displays a unified grid of all badges for easy selection.
const BadgeChampPicker = forwardRef<HTMLDivElement, BadgeChampPickerProps>(
  ({ user, selectionMode, onBadgeSelect, onBadgeRemove }, ref) => {
    // State for selected badge (controls isOpen animation).
    const [selectedBadge, setSelectedBadge] = useState<SelectedBadgeInfo | null>(null)
    // Displayed badge persists during close animation so content doesn't disappear instantly.
    const [displayedBadge, setDisplayedBadge] = useState<SelectedBadgeInfo | null>(null)

    // Sync displayedBadge with selectedBadge, but delay clearing to allow close animation.
    useEffect(() => {
      if (selectedBadge) {
        setDisplayedBadge(selectedBadge)
      } else {
        const timeout = setTimeout(() => setDisplayedBadge(null), 300)
        return () => clearTimeout(timeout)
      }
    }, [selectedBadge])

    // Collect all earned badges sorted by rarity (highest first) for selection mode.
    const allEarnedBadges = useMemo(() => {
      return user.badges
        .filter(badge => badge.url)
        .sort((a, b) => b.rarity - a.rarity)
    }, [user.badges])

    // Check if the currently selected slot already has a badge assigned.
    const targetSlotHasBadge = useMemo(() => {
      if (!selectionMode.active || selectionMode.targetSlot === null) return false
      return user.badges.some(badge => badge.featured === selectionMode.targetSlot)
    }, [selectionMode, user.badges])

    // Handles badge click during selection mode.
    const handleBadgeClick = (badge: userBadgeSnapshotType) => {
      if (!selectionMode.active) return
      onBadgeSelect(badge._id)
    }

    // Handles badge click for info display in normal mode.
    const handleBadgeInfoClick = (badge: userBadgeSnapshotType, champId: string) => {
      setSelectedBadge(prev =>
        prev?.badge._id === badge._id ? null : { badge, champId }
      )
    }

    return (
      <div
        className={`badge-champ-picker ${selectionMode.active ? 'selection-mode' : ''}`}
        ref={ref}
        style={{ paddingBottom: selectionMode.active ? 0 : 120}}
        onClick={() => setSelectedBadge(null)}
      >
        {/* Tooltip header - slides in during selection mode */}
        <div className={`badge-champ-tooltip ${selectionMode.active ? 'visible' : ''}`}>
          <WorkspacePremium/>
          <h5 className="tooltip-text">Select a Badge</h5>
          {targetSlotHasBadge && (
            <Button
              variant="contained"
              size="small"
              sx={{ marginLeft: "auto" }}
              onClick={onBadgeRemove}
            >
              Remove
            </Button>
          )}
        </div>

        {/* Normal mode: Championship sections with headers */}
        {!selectionMode.active && user.championships.map((c) => (
          <ChampSection
            key={c._id}
            user={user}
            champ={c}
            onBadgeClick={handleBadgeInfoClick}
            activeBadge={displayedBadge?.champId === c._id ? displayedBadge.badge : null}
            isOpen={selectedBadge?.champId === c._id}
          />
        ))}

        {/* Selection mode: Unified badge grid without headers */}
        {selectionMode.active && (
          <div className="unified-badges-grid">
            {allEarnedBadges.length > 0 ? (
              allEarnedBadges.map((badge) => (
                <div
                  key={badge._id}
                  className="selectable-badge"
                  onClick={() => handleBadgeClick(badge)}
                >
                  <Badge badge={badge} zoom={badge.zoom} showEditButton={false} />
                  {/* Indicator showing which slot this badge is currently in */}
                  {badge.featured && (
                    <span className="featured-indicator">{badge.featured}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="no-badges-message">No badges available to feature</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

BadgeChampPicker.displayName = 'BadgeChampPicker'

export default BadgeChampPicker
