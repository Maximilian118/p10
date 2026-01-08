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
  takenBy?: userType
  disabled?: boolean
  displayMode?: 'driver' | 'competitor'
  competitor?: CompetitorEntryType
}

// Card component for displaying a driver or competitor in the betting grid.
// Shows bet status (my bet, taken by other, pending, rejected).
// When displayMode is 'competitor', shows competitor info instead of driver.
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
  competitor
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
  const competitorIcon = isCompetitorMode ? competitor.competitor.icon : takenBy?.icon

  return (
    <div
      className={`
        driver-bet-card
        ${isMyBet ? "my-bet" : ""}
        ${isTakenByOther ? "taken" : ""}
        ${isPending ? "pending" : ""}
        ${isRejected ? "rejected" : ""}
        ${isPlacedForOther ? "placed-for-other" : ""}
        ${isNewlyTaken ? "newly-taken" : ""}
        ${disabled ? "observer" : ""}
        ${isCompetitorMode ? "competitor-mode" : ""}
      `}
      onClick={handleClick}
    >
      <div className="driver-card-header">
        {isPending && <CircularProgress size="18px"/>}
        <p>{isCompetitorMode ? competitor.competitor.name : driver.driverID}</p>
      </div>
      {!isCompetitorMode && <img className="driver-icon" alt="driver" src={driver.icon}/>}
      {showCompetitorIcon && competitorIcon && <ImageIcon src={competitorIcon} size="large"/>}
    </div>
  )
}

export default DriverBetCard
