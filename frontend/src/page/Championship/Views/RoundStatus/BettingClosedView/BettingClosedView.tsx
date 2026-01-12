import React, { useContext, useState, useCallback } from "react"
import "./_bettingClosedView.scss"
import { RoundType, driverType, ChampType } from "../../../../../shared/types"
import { graphQLErrorType } from "../../../../../shared/requests/requestsUtility"
import AppContext from "../../../../../context"
import Button from "@mui/material/Button"
import { CircularProgress } from "@mui/material"
import DriversGrid from "../../../components/DriversGrid/DriversGrid"
import { submitDriverPositions } from "../../../../../shared/requests/champRequests"
import { useNavigate } from "react-router-dom"

interface BettingClosedViewProps {
  round: RoundType
  roundIndex: number
  champId: string
  isAdjudicator?: boolean
  onAdvance?: () => void
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// View displayed when betting has closed (for series without API).
// For adjudicators: shows position input mode to enter qualifying results.
// For others: shows current bets in read-only mode while waiting for results.
const BettingClosedView: React.FC<BettingClosedViewProps> = ({
  round,
  roundIndex,
  champId,
  isAdjudicator,
  onAdvance,
  setChamp,
  setBackendErr
}) => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  // Position assignment state (adjudicator only).
  const [positionAssignments, setPositionAssignments] = useState<Map<string, number>>(new Map())
  const [currentPosition, setCurrentPosition] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null)

  // Find the current user's bet to highlight it (non-adjudicator mode).
  const currentUserCompetitor = round.competitors.find(
    c => c.competitor._id === user._id
  )
  const currentUserBetId = currentUserCompetitor?.bet?._id || null

  // Get total number of drivers for validation.
  const totalDrivers = round.drivers.length
  const allPositionsAssigned = positionAssignments.size === totalDrivers

  // Handles driver click in position input mode.
  const handleDriverClick = useCallback((driver: driverType) => {
    if (!driver._id || isSubmitting) return

    const driverId = driver._id
    const existingPosition = positionAssignments.get(driverId)

    if (existingPosition !== undefined) {
      // Driver already has a position - remove it and shift others down.
      const newAssignments = new Map<string, number>()
      positionAssignments.forEach((pos, id) => {
        if (id === driverId) return // Skip the removed driver.
        // Shift positions down for drivers assigned after this one.
        newAssignments.set(id, pos > existingPosition ? pos - 1 : pos)
      })
      setPositionAssignments(newAssignments)
      setCurrentPosition(prev => prev - 1)
    } else {
      // Assign current position to this driver.
      setPendingDriverId(driverId)
      setTimeout(() => {
        setPositionAssignments(prev => new Map(prev).set(driverId, currentPosition))
        setCurrentPosition(prev => prev + 1)
        setPendingDriverId(null)
      }, 150) // Brief delay for visual feedback.
    }
  }, [positionAssignments, currentPosition, isSubmitting])

  // Handles confirm button click - submits positions to backend.
  const handleConfirmPositions = async () => {
    if (!allPositionsAssigned || isSubmitting) return

    setIsSubmitting(true)

    // Convert Map to array format for API.
    const driverPositionsArray: { driverId: string; positionActual: number }[] = []
    positionAssignments.forEach((positionActual, driverId) => {
      driverPositionsArray.push({ driverId, positionActual })
    })

    const result = await submitDriverPositions(
      champId,
      roundIndex,
      driverPositionsArray,
      user,
      setUser,
      navigate,
      setBackendErr
    )

    if (result) {
      // Update champ state with new data (will trigger view change via socket).
      setChamp(result)
    }

    setIsSubmitting(false)
  }

  // Adjudicator sees position input mode.
  if (isAdjudicator) {
    return (
      <div className="betting-closed-view position-input-mode">
        <p className="betting-closed-title">
          {allPositionsAssigned
            ? "All positions assigned."
            : `Select the driver that placed`
          }
          {!allPositionsAssigned && <span className="position-indicator"> P{currentPosition}</span>}
        </p>
        <div className="grid-container" style={{ paddingBottom: 20 }}>
          <DriversGrid
            round={round}
            isInteractive={true}
            onDriverClick={handleDriverClick}
            isPositionInputMode={true}
            positionAssignments={positionAssignments}
            pendingDriverId={pendingDriverId}
            disabled={isSubmitting}
          />
        </div>
        <Button
          variant="contained"
          className="advance-button"
          color="primary"
          onClick={handleConfirmPositions}
          disabled={!allPositionsAssigned || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} color="inherit" style={{ marginRight: 8 }} />
              Submitting...
            </>
          ) : (
            "Confirm Driver Positions"
          )}
        </Button>
      </div>
    )
  }

  // Non-adjudicator sees read-only view.
  return (
    <div className="betting-closed-view">
      <p className="betting-closed-title">Betting is closed.</p>
      <div className="grid-container" style={{ paddingBottom: onAdvance ? 20 : 140 }}>
        <DriversGrid
          round={round}
          currentUserBetId={currentUserBetId}
          isInteractive={false}
          disabled={true}
        />
      </div>
      {onAdvance && (
        <Button
          variant="contained"
          className="advance-button"
          color="primary"
          onClick={onAdvance}
        >
          Show Results
        </Button>
      )}
    </div>
  )
}

export default BettingClosedView
