import React, { useContext, useState, useEffect } from "react"
import "./_bettingOpenView.scss"
import { RoundType, driverType, CompetitorEntryType, AutomationSettingsType, DriverEntryType } from "../../../../../shared/types"
import { initDriver } from "../../../../../shared/init"
import { placeBetViaSocket, BetRejectedPayload, BetPlacedPayload } from "../../../../../shared/socket/socketClient"
import AppContext from "../../../../../context"
import Button from "@mui/material/Button"
import DriverBetCard from "../../../../../components/cards/driverBetCard/DriverBetCard"
import Timer from "../../../components/Timer/Timer"
import CloseBettingConfirm from "../CloseBettingConfirm/CloseBettingConfirm"
import BettingSwitcher from "../../../components/BettingSwitcher/BettingSwitcher"

interface BettingOpenViewProps {
  round: RoundType
  champId: string
  roundIndex: number
  isAdjudicator?: boolean
  onAdvance?: () => void
  lastRejectedBet?: BetRejectedPayload | null
  lastBetPlaced?: BetPlacedPayload | null
  automation?: AutomationSettingsType
  previousRoundDrivers?: DriverEntryType[]
  competitorsCanBet?: boolean
}

// Calculates total betting window duration in seconds.
const calculateBettingDuration = (automation: AutomationSettingsType): number => {
  const { autoOpenTime, autoCloseTime } = automation.bettingWindow
  return (autoOpenTime + autoCloseTime) * 60
}

// Calculates remaining seconds based on when betting_open started.
const calculateSecondsLeft = (statusChangedAt: string | null, duration: number): number => {
  if (!statusChangedAt) return duration
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return Math.max(0, duration - elapsed)
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
  lastRejectedBet,
  lastBetPlaced,
  automation,
  previousRoundDrivers,
  competitorsCanBet = true
}) => {
  const { user } = useContext(AppContext)
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null)
  const [rejectedDriverId, setRejectedDriverId] = useState<string | null>(null)
  const [placedForOtherDriverId, setPlacedForOtherDriverId] = useState<string | null>(null)
  const [betPlacedForMeDriverId, setBetPlacedForMeDriverId] = useState<string | null>(null)
  const [newlyTakenDriverId, setNewlyTakenDriverId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPlacingForOthers, setIsPlacingForOthers] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  // Determine if we're in competitor selection mode (adjudicator selected a driver).
  const isSelectingCompetitor = isPlacingForOthers && selectedDriverId !== null

  // Determine if countdown timer should be shown.
  const showTimer = automation?.enabled
    && automation.bettingWindow.autoOpen
    && automation.bettingWindow.autoClose

  // Calculate initial countdown duration and seconds left.
  const duration = automation ? calculateBettingDuration(automation) : 0
  const [secondsLeft, setSecondsLeft] = useState(() =>
    showTimer ? calculateSecondsLeft(round.statusChangedAt, duration) : 0
  )

  // Decrement timer every second.
  useEffect(() => {
    if (!showTimer || secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [showTimer, secondsLeft])

  // Get all drivers, sorted by previous round qualifying position if available.
  const drivers: driverType[] = (() => {
    const currentDrivers = round.drivers.map(d => d.driver)

    if (!previousRoundDrivers?.length) return currentDrivers

    // Create position map from previous round qualifying results.
    const positionMap = new Map<string, number>()
    previousRoundDrivers.forEach(entry => {
      if (entry.driver._id && entry.positionActual) {
        positionMap.set(entry.driver._id, entry.positionActual)
      }
    })

    // Sort by previous qualifying position (drivers not in previous round go to end).
    return [...currentDrivers].sort((a, b) => {
      const posA = positionMap.get(a._id!) ?? 999
      const posB = positionMap.get(b._id!) ?? 999
      return posA - posB
    })
  })()

  // Find the current user's competitor entry.
  const currentUserCompetitor = round.competitors.find(
    c => c.competitor._id === user._id
  )
  const currentUserBetId = currentUserCompetitor?.bet?._id || null

  // Determine if user is an observer (not a competitor in this championship).
  const isObserver = !currentUserCompetitor

  // Clear pending state when bet is confirmed (detected via round.competitors update).
  useEffect(() => {
    if (!pendingDriverId) return

    // When placing our own bet, check if our bet matches pending.
    if (currentUserBetId === pendingDriverId) {
      setPendingDriverId(null)
      return
    }

    // When in "Place for Others" mode, clear when any competitor has the pending driver.
    if (isPlacingForOthers) {
      const driverNowTaken = round.competitors.some(c => c.bet?._id === pendingDriverId)
      if (driverNowTaken) {
        // Show success animation for the placed bet.
        setPlacedForOtherDriverId(pendingDriverId)
        setPendingDriverId(null)
      }
    }
  }, [currentUserBetId, pendingDriverId, isPlacingForOthers, round.competitors])

  // Clear placed-for-other state after animation completes.
  useEffect(() => {
    if (!placedForOtherDriverId) return
    const timer = setTimeout(() => setPlacedForOtherDriverId(null), 500)
    return () => clearTimeout(timer)
  }, [placedForOtherDriverId])

  // Detect when a bet was placed and determine which animation to show.
  useEffect(() => {
    if (!lastBetPlaced || !lastBetPlaced.driverId) return

    if (lastBetPlaced.competitorId === user._id) {
      // Bet was placed FOR the current user (by adjudicator) - show green animation.
      setBetPlacedForMeDriverId(lastBetPlaced.driverId)
    } else {
      // Bet was placed by/for someone else - show red "newly taken" animation.
      setNewlyTakenDriverId(lastBetPlaced.driverId)
    }
  }, [lastBetPlaced, user._id])

  // Clear bet-placed-for-me state after animation completes.
  useEffect(() => {
    if (!betPlacedForMeDriverId) return
    const timer = setTimeout(() => setBetPlacedForMeDriverId(null), 500)
    return () => clearTimeout(timer)
  }, [betPlacedForMeDriverId])

  // Clear newly-taken state after animation completes.
  useEffect(() => {
    if (!newlyTakenDriverId) return
    const timer = setTimeout(() => setNewlyTakenDriverId(null), 700)
    return () => clearTimeout(timer)
  }, [newlyTakenDriverId])

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

  // Get competitors sorted by totalPoints (descending) for "Place for Others" mode.
  const sortedCompetitors = [...round.competitors].sort(
    (a, b) => b.totalPoints - a.totalPoints
  )

  // Handles clicking on a driver to place a bet or select driver for "Place for Others".
  const handleDriverClick = (driver: driverType): void => {
    if (!driver._id) return

    // Don't allow click if already waiting for a bet response.
    if (pendingDriverId) return

    // If in "Place for Others" mode, select this driver and switch to competitor view.
    if (isPlacingForOthers && !isSelectingCompetitor) {
      setSelectedDriverId(driver._id)
      return
    }

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

  // Handles clicking on a competitor to place bet for them (adjudicator only).
  const handleCompetitorClick = (competitorEntry: CompetitorEntryType): void => {
    if (!selectedDriverId || !competitorEntry.competitor._id) return

    // Don't allow click if already waiting for a bet response.
    if (pendingDriverId) return

    // Place bet for this competitor on the selected driver.
    setPendingDriverId(selectedDriverId)
    placeBetViaSocket(champId, roundIndex, selectedDriverId, competitorEntry.competitor._id)

    // Reset to driver view after placing bet.
    setSelectedDriverId(null)
  }

  // Check if all competitors have placed bets and all drivers are taken.
  const allCompetitorsBet = round.competitors.every(c => c.bet !== null)
  const allDriversTaken = round.drivers.every(d =>
    round.competitors.some(c => c.bet?._id === d.driver._id)
  )
  // Show confirmation if: timer active (auto-close expected) OR betting incomplete.
  const needsConfirmation = showTimer || (!allCompetitorsBet && !allDriversTaken)

  // Handle close betting button click.
  const handleCloseBetting = () => {
    if (needsConfirmation) {
      setShowConfirm(true)
    } else if (onAdvance) {
      onAdvance()
    }
  }

  // Show confirmation view if requested.
  if (showConfirm && onAdvance) {
    return (
      <CloseBettingConfirm
        onCancel={() => setShowConfirm(false)}
        onConfirm={onAdvance}
      />
    )
  }

  const advButton = isAdjudicator && onAdvance
  const gridPad = showTimer || advButton

  // Determines the title shown to non-adjudicators based on their betting status.
  const getBettingTitle = (): string => {
    if (isObserver) return "Spectating"
    if (!competitorsCanBet) return "Bets being placed!"
    return "Place your bet!"
  }

  return (
    <div className="betting-open-view">
      {!isAdjudicator && <p className="betting-open-title">{getBettingTitle()}</p>}
      {isAdjudicator && (
        <BettingSwitcher
          isActive={isPlacingForOthers}
          onToggle={() => {
            setIsPlacingForOthers(prev => !prev)
            setSelectedDriverId(null)
          }}
        />
      )}
      <div className="drivers-grid" style={{ paddingBottom: gridPad ? 20 : 140 }}>
        {isSelectingCompetitor ? (
          // Competitor selection mode - show competitors sorted by totalPoints.
          sortedCompetitors.map(competitorEntry => {
            if (!competitorEntry.competitor._id) return null

            // Use initDriver utility to create placeholder (required prop).
            const placeholderDriver = initDriver(user)

            return (
              <DriverBetCard
                key={competitorEntry.competitor._id}
                driver={placeholderDriver}
                displayMode="competitor"
                competitor={competitorEntry}
                isMyBet={false}
                isPending={false}
                isRejected={false}
                onClick={() => handleCompetitorClick(competitorEntry)}
              />
            )
          })
        ) : (
          // Normal driver view.
          drivers.map(driver => {
            if (!driver._id) return null

            const takenBy = findCompetitorWithBet(round.competitors, driver._id)
            const isMyBet = currentUserBetId === driver._id
            const isPending = pendingDriverId === driver._id
            const isRejected = rejectedDriverId === driver._id
            const isBetPlacedForMe = betPlacedForMeDriverId === driver._id
            const isPlacedForOther = placedForOtherDriverId === driver._id || isBetPlacedForMe
            const isNewlyTaken = newlyTakenDriverId === driver._id && !isPlacedForOther

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
                disabled={!isAdjudicator && (isObserver || !competitorsCanBet)}
              />
            )
          })
        )}
      </div>
      {isSelectingCompetitor ? (
        <Button
          variant="contained"
          className="advance-button"
          color="inherit"
          onClick={() => setSelectedDriverId(null)}
        >
          Back
        </Button>
      ) : (
        advButton && (
          <Button
            variant="contained"
            className="advance-button"
            color="error"
            onClick={handleCloseBetting}
          >
            Close Betting
          </Button>
        )
      )}
      {showTimer && <Timer seconds={secondsLeft} format="minutes"/>}
    </div>
  )
}

export default BettingOpenView
