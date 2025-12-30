import React from "react"
import "./_bettingClosedView.scss"
import { RoundType } from "../../../../../shared/types"

interface BettingClosedViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
}

// View displayed when betting has closed.
// Shows current bets and tracks how everyone's bet is doing during qualifying.
const BettingClosedView: React.FC<BettingClosedViewProps> = ({ round, isAdjudicator, onAdvance }) => {
  return (
    <div className="betting-closed-view">
      <h2>Round {round.round} - Betting Closed</h2>
      <p>Waiting for results...</p>
      {isAdjudicator && onAdvance && (
        <button className="advance-btn" onClick={onAdvance}>
          Show Results
        </button>
      )}
    </div>
  )
}

export default BettingClosedView
