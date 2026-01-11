import React, { useContext } from "react"
import "./_bettingClosedView.scss"
import { RoundType } from "../../../../../shared/types"
import AppContext from "../../../../../context"
import Button from "@mui/material/Button"
import DriversGrid from "../../../components/DriversGrid/DriversGrid"

interface BettingClosedViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
}

// View displayed when betting has closed (for series without API).
// Shows current bets in read-only mode while waiting for results.
const BettingClosedView: React.FC<BettingClosedViewProps> = ({
  round,
  isAdjudicator,
  onAdvance
}) => {
  const { user } = useContext(AppContext)

  // Find the current user's bet to highlight it.
  const currentUserCompetitor = round.competitors.find(
    c => c.competitor._id === user._id
  )
  const currentUserBetId = currentUserCompetitor?.bet?._id || null

  const advButton = isAdjudicator && onAdvance

  return (
    <div className="betting-closed-view">
      <p className="betting-closed-title">Betting is closed.</p>
      <div className="grid-container" style={{ paddingBottom: advButton ? 20 : 140 }}>
        <DriversGrid
          round={round}
          currentUserBetId={currentUserBetId}
          isInteractive={false}
          disabled={true}
        />
      </div>
      {advButton && (
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
