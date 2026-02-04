import React from "react"
import { ProtestStatus } from "../../../../../../shared/types"
import "./_adjudicationPanel.scss"

interface AdjudicationPanelProps {
  status: ProtestStatus
  actionLoading: boolean
  onDetermination: (status: ProtestStatus) => void
  onMoveToVoting: () => void
}

// Adjudicator actions panel for pass/deny/move-to-vote decisions.
const AdjudicationPanel: React.FC<AdjudicationPanelProps> = ({
  status,
  actionLoading,
  onDetermination,
  onMoveToVoting,
}) => {
  return (
    <div className="adjudication-panel">
      <p className="adjudication-panel__label">Adjudicator Actions</p>

      {/* Determination buttons */}
      <div className="adjudication-panel__buttons">
        <button
          className="adjudication-panel__btn adjudication-panel__btn--pass"
          onClick={() => onDetermination("passed")}
          disabled={actionLoading}
        >
          Pass
        </button>
        <button
          className="adjudication-panel__btn adjudication-panel__btn--deny"
          onClick={() => onDetermination("denied")}
          disabled={actionLoading}
        >
          Deny
        </button>
      </div>

      {/* Move to voting button - only in adjudicating status */}
      {status === "adjudicating" && (
        <button
          className="adjudication-panel__btn adjudication-panel__btn--voting"
          onClick={onMoveToVoting}
          disabled={actionLoading}
        >
          Move to Vote
        </button>
      )}
    </div>
  )
}

export default AdjudicationPanel
