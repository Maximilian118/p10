import React from "react"
import "./_driverBetCard.scss"
import { driverType, CompetitorEntryType } from "../../../shared/types"
import { userType } from "../../../shared/localStorage"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { CircularProgress } from "@mui/material"

interface DriverBetCardProps {
  driver: driverType
  isMyBet: boolean
  isPending: boolean
  isRejected: boolean
  isPlacedForOther?: boolean
  isNewlyTaken?: boolean
  onClick: () => void
  takenBy?: userType | null
  disabled?: boolean
  displayMode?: 'driver' | 'competitor'
  competitor?: CompetitorEntryType
  // Position input mode props (for adjudicator)
  positionAssigned?: number | null
  isPositionInputMode?: boolean
}

// Card component for displaying a driver or competitor in the betting grid.
// Shows bet status (my bet, taken by other, pending, rejected).
// When displayMode is 'competitor', shows competitor info instead of driver.
// In position input mode, shows position badge behind driver icon.
const DriverBetCard: React.FC<DriverBetCardProps> = ({
  driver,
  isMyBet,
  takenBy,
  isPending,
  isRejected,
  isPlacedForOther,
  isNewlyTaken,
  onClick,
  disabled,
  displayMode = 'driver',
  competitor,
  positionAssigned,
  isPositionInputMode = false
}) => {
  // Derive isTakenByOther from takenBy prop.
  const isTakenByOther = !!takenBy && !isMyBet

  // Handles card click, preventing interaction when disabled (observer mode).
  const handleClick = () => {
    if (disabled) return
    onClick()
  }

  // Determine display values based on mode.
  const isCompetitorMode = displayMode === 'competitor' && competitor
  const showCompetitorIcon = takenBy || isCompetitorMode
  const competitorIcon = isCompetitorMode
    ? (competitor.competitor?.icon ?? competitor.deletedUserSnapshot?.icon)
    : takenBy?.icon

  // Position badge styling class based on position.
  const getPositionBadgeClass = (position: number): string => {
    if (position === 1) return "p1"
    if (position === 2) return "p2"
    if (position === 3) return "p3"
    return "default"
  }

  // In position input mode, use simplified class list.
  const className = isPositionInputMode
    ? `driver-bet-card position-input-mode ${positionAssigned ? "assigned" : ""} ${isPending ? "pending" : ""} ${disabled ? "observer" : ""}`
    : `driver-bet-card ${isMyBet ? "my-bet" : ""} ${isTakenByOther ? "taken" : ""} ${isPending ? "pending" : ""} ${isRejected ? "rejected" : ""} ${isPlacedForOther ? "placed-for-other" : ""} ${isNewlyTaken ? "newly-taken" : ""} ${disabled ? "observer" : ""} ${isCompetitorMode ? "competitor-mode" : ""}`

  return (
    <div className={className} onClick={handleClick}>
      {/* Position badge - shown behind driver in position input mode */}
      {isPositionInputMode && positionAssigned && (
        <div className={`position-badge ${getPositionBadgeClass(positionAssigned)}`}>
          <span>P{positionAssigned}</span>
        </div>
      )}
      <div className="driver-card-header">
        {isPending && <CircularProgress size="18px"/>}
        <p>{isCompetitorMode ? (competitor.competitor?.name ?? competitor.deletedUserSnapshot?.name ?? "Deleted User") : driver.driverID}</p>
      </div>
      {!isCompetitorMode && <img className="driver-icon" alt="driver" src={driver.icon}/>}
      {showCompetitorIcon && competitorIcon && !isPositionInputMode && <ImageIcon src={competitorIcon} size="large"/>}
    </div>
  )
}

export default DriverBetCard
