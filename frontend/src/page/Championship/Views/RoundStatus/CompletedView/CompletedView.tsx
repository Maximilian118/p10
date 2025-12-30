import React from "react"
import "./_completedView.scss"
import { RoundType } from "../../../../../shared/types"

interface CompletedViewProps {
  round: RoundType
}

// View displayed when the round is completed.
// Shows final standings and transitions back to default view.
const CompletedView: React.FC<CompletedViewProps> = ({ round }) => {
  return (
    <div className="completed-view">
      <h2>Round {round.round} - Complete</h2>
      <p>Round finished</p>
    </div>
  )
}

export default CompletedView
