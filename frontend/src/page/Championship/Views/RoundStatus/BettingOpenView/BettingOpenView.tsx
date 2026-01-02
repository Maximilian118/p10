import React, { useContext, useState, useEffect } from "react"
import "./_bettingOpenView.scss"
import { RoundType, driverType, CompetitorEntryType } from "../../../../../shared/types"
import { placeBetViaSocket, BetRejectedPayload } from "../../../../../shared/socket/socketClient"
import AppContext from "../../../../../context"
import Button from "@mui/material/Button"
import DriverBetCard from "../../../../../components/cards/driverBetCard/DriverBetCard"

interface BettingOpenViewProps {
  round: RoundType
  champId: string
  roundIndex: number
  isAdjudicator?: boolean
  onAdvance?: () => void
  lastRejectedBet?: BetRejectedPayload | null
}

// Finds which competitor (if any) has bet on a specific driver.
const findCompetitorWithBet = (
  competitors: CompetitorEntryType[],
  driverId: string
): CompetitorEntryType | undefined => {
  return competitors.find(c => c.bet?._id === driverId)
}

// View displayed when the betting window is open.
// Users can place their bets on which driver will finish P10.
const BettingOpenView: React.FC<BettingOpenViewProps> = ({
  round,
  champId,
  roundIndex,
  isAdjudicator,
  onAdvance,
  lastRejectedBet
}) => {
  const { user } = useContext(AppContext)
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null)
  const [rejectedDriverId, setRejectedDriverId] = useState<string | null>(null)

  // Get all drivers from the round's drivers array.
  const drivers: driverType[] = round.drivers.map(d => d.driver)

  // Find the current user's competitor entry.
  const currentUserCompetitor = round.competitors.find(
    c => c.competitor._id === user._id
  )
  const currentUserBetId = currentUserCompetitor?.bet?._id || null

  // Clear pending state when bet is confirmed (detected via round.competitors update).
  useEffect(() => {
    if (pendingDriverId && currentUserBetId === pendingDriverId) {
      setPendingDriverId(null)
    }
  }, [currentUserBetId, pendingDriverId])

  // Handle rejected bet via socket event from parent.
  useEffect(() => {
    if (lastRejectedBet && lastRejectedBet.driverId === pendingDriverId) {
      setPendingDriverId(null)
      setRejectedDriverId(lastRejectedBet.driverId)
      // Clear rejected state after animation.
      const timer = setTimeout(() => setRejectedDriverId(null), 500)
      return () => clearTimeout(timer)
    }
  }, [lastRejectedBet, pendingDriverId])

  // Handles clicking on a driver to place a bet.
  const handleDriverClick = (driver: driverType): void => {
    if (!driver._id) return

    // Don't allow click if already waiting for a bet response.
    if (pendingDriverId) return

    // Check if driver is already taken by another competitor.
    const takenBy = findCompetitorWithBet(round.competitors, driver._id)
    if (takenBy && takenBy.competitor._id !== user._id) {
      return
    }

    // If already betting on this driver, do nothing.
    if (currentUserBetId === driver._id) return

    // Set pending state and send bet via socket.
    setPendingDriverId(driver._id)
    placeBetViaSocket(champId, roundIndex, driver._id)
  }

  return (
    <div className="betting-open-view">
      <div className="drivers-grid">
        {drivers.map(driver => {
          if (!driver._id) return null

          const takenBy = findCompetitorWithBet(round.competitors, driver._id)
          const isMyBet = currentUserBetId === driver._id
          const isPending = pendingDriverId === driver._id
          const isRejected = rejectedDriverId === driver._id

          return (
            <DriverBetCard
              key={driver._id}
              driver={driver}
              isMyBet={isMyBet}
              takenBy={takenBy?.competitor}
              isPending={isPending}
              isRejected={isRejected}
              onClick={() => handleDriverClick(driver)}
            />
          )
        })}
      </div>

      {isAdjudicator && onAdvance && (
        <Button
          variant="contained"
          color="error"
          className="advance-btn"
          onClick={onAdvance}
        >
          Close Betting
        </Button>
      )}
    </div>
  )
}

export default BettingOpenView
