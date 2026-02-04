import React from "react"
import { ProtestStatus } from "../../../../../../shared/types"
import "./_adjudicationPanel.scss"
import { Button } from "@mui/material"
import { Done, DoNotDisturb, HowToVote } from "@mui/icons-material"

interface AdjudicationPanelProps {
  status: ProtestStatus
  onDetermination: (status: ProtestStatus) => void
  onMoveToVoting: () => void
}

// Adjudicator actions panel for pass/deny/move-to-vote decisions.
const AdjudicationPanel: React.FC<AdjudicationPanelProps> = ({
  status,
  onDetermination,
  onMoveToVoting,
}) => {
  return (
    <div className="adjudication-panel">
      <p className="adjudication-panel__label">Adjudicator Actions</p>

      {/* Determination buttons */}
      <div className="adjudication-panel__buttons">
        <Button
          variant="contained"
          className="adjudication-panel__btn--pass"
          onClick={() => onDetermination("passed")}
          startIcon={<Done/>}
        >
          Pass
        </Button>
        <Button
          variant="contained"
          className="adjudication-panel__btn--deny"
          onClick={() => onDetermination("denied")}
          startIcon={<DoNotDisturb/>}
        >
          Deny
        </Button>
      </div>

      {/* Move to voting button - only in adjudicating status */}
      {status === "adjudicating" && (
        <Button
          variant="contained"
          className="adjudication-panel__btn--voting"
          onClick={onMoveToVoting}
          startIcon={<HowToVote/>}
        >
          Move to Vote
        </Button>
      )}
    </div>
  )
}

export default AdjudicationPanel
