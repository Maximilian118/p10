import React from "react"
import "./_bettingOpenView.scss"
import { RoundType } from "../../../../../shared/types"

interface BettingOpenViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
}

// View displayed when the betting window is open.
// Users can place their bets on which driver will finish P10.
const BettingOpenView: React.FC<BettingOpenViewProps> = ({ round, isAdjudicator, onAdvance }) => {
  return (
    <div className="betting-open-view">
      <h2>Round {round.round} - Betting Open</h2>
      <p>Place your bet!</p>
      {isAdjudicator && onAdvance && (
        <button className="advance-btn" onClick={onAdvance}>
          Close Betting
        </button>
      )}
    </div>
  )
}

export default BettingOpenView
