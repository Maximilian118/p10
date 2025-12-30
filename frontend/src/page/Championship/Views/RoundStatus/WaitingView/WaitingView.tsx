import React from "react"
import "./_waitingView.scss"
import { RoundType } from "../../../../../shared/types"

interface WaitingViewProps {
  round: RoundType
}

// View displayed when the round is waiting to start.
const WaitingView: React.FC<WaitingViewProps> = ({ round }) => {
  return (
    <div className="waiting-view">
      <h2>Round {round.round}</h2>
      <p>Waiting for round to start...</p>
    </div>
  )
}

export default WaitingView
