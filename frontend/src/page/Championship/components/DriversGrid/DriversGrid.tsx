import React from "react"
import "./_driversGrid.scss"
import { RoundType, driverType, CompetitorEntryType } from "../../../../shared/types"
import DriverBetCard from "../../../../components/cards/driverBetCard/DriverBetCard"

interface DriversGridProps {
  round: RoundType
  currentUserBetId?: string | null
  isInteractive?: boolean
  onDriverClick?: (driver: driverType) => void
  pendingDriverId?: string | null
  rejectedDriverId?: string | null
  placedForOtherDriverId?: string | null
  betPlacedForMeDriverId?: string | null
  newlyTakenDriverId?: string | null
  disabled?: boolean
  // Position input mode props (for adjudicator)
  isPositionInputMode?: boolean
  positionAssignments?: Map<string, number>
}

// Finds which competitor (if any) has bet on a specific driver.
const findCompetitorWithBet = (
  competitors: CompetitorEntryType[],
  driverId: string
): CompetitorEntryType | undefined => {
  return competitors.find(c => c.bet?._id === driverId)
}

// Shared grid component for displaying drivers with bet status.
// Used by BettingOpenView (interactive), BettingClosedView (read-only), and position input mode.
const DriversGrid: React.FC<DriversGridProps> = ({
  round,
  currentUserBetId,
  isInteractive = false,
  onDriverClick,
  pendingDriverId = null,
  rejectedDriverId = null,
  placedForOtherDriverId = null,
  betPlacedForMeDriverId = null,
  newlyTakenDriverId = null,
  disabled = false,
  isPositionInputMode = false,
  positionAssignments
}) => {
  // Get drivers in the randomised order stored on the round.
  const drivers: driverType[] = round.randomisedDrivers?.length
    ? round.randomisedDrivers.map(d => d.driver)
    : round.drivers.map(d => d.driver)

  // Handles clicking on a driver card.
  const handleDriverClick = (driver: driverType): void => {
    if (!isInteractive || disabled || !onDriverClick) return
    onDriverClick(driver)
  }

  return (
    <div className="drivers-grid">
      {drivers.map(driver => {
        if (!driver._id) return null

        const takenBy = findCompetitorWithBet(round.competitors, driver._id)
        const isMyBet = currentUserBetId === driver._id
        const isPending = pendingDriverId === driver._id
        const isRejected = rejectedDriverId === driver._id
        const isBetPlacedForMe = betPlacedForMeDriverId === driver._id
        const isPlacedForOther = placedForOtherDriverId === driver._id || isBetPlacedForMe
        const isNewlyTaken = newlyTakenDriverId === driver._id && !isPlacedForOther

        // Get position assigned to this driver in position input mode.
        const positionAssigned = isPositionInputMode && driver._id
          ? positionAssignments?.get(driver._id) ?? null
          : null

        return (
          <DriverBetCard
            key={driver._id}
            driver={driver}
            isMyBet={isMyBet}
            takenBy={takenBy?.competitor}
            isPending={isPending}
            isRejected={isRejected}
            isPlacedForOther={isPlacedForOther}
            isNewlyTaken={isNewlyTaken}
            onClick={() => handleDriverClick(driver)}
            disabled={disabled || !isInteractive}
            isPositionInputMode={isPositionInputMode}
            positionAssigned={positionAssigned}
          />
        )
      })}
    </div>
  )
}

export default DriversGrid
