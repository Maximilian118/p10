import React from "react"
import "./_f1SessionView.scss"
import { RoundType } from "../../../../../../shared/types"
import Button from "@mui/material/Button"

interface F1SessionViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
}

// View displayed when betting has closed for F1 series.
// Placeholder for live session data from F1 API.
const F1SessionView: React.FC<F1SessionViewProps> = ({
  isAdjudicator,
  onAdvance
}) => {

  const advButton = isAdjudicator && onAdvance

  return (
    <div className="f1-session-view">
      <p className="f1-session-title">F1 Live Session</p>
      <p className="f1-session-subtitle">Live session data coming soon...</p>
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

export default F1SessionView
