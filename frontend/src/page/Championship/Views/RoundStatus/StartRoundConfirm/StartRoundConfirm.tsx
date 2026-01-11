import React from "react"
import "./_startRoundConfirm.scss"
import { Button } from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"

interface StartRoundConfirmProps {
  onCancel: () => void
  onConfirm: () => void
}

// Confirmation view shown when adjudicator presses start round.
const StartRoundConfirm: React.FC<StartRoundConfirmProps> = ({
  onCancel,
  onConfirm
}) => {
  return (
    <div className="start-round-confirm">
      <div className="start-round-confirm__header">
        <PlayArrowIcon className="start-round-confirm__icon" />
        <h2>Start Round?</h2>
      </div>
      <div className="start-round-confirm__content">
        <p>
          This will begin the countdown.
        </p>
        <p>
          Betting will open shortly after.
        </p>
      </div>
      <div className="start-round-confirm__actions">
        <Button
          variant="outlined"
          onClick={onCancel}
          className="start-round-confirm__btn start-round-confirm__btn--cancel"
        >
          Go Back
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          className="start-round-confirm__btn start-round-confirm__btn--confirm"
        >
          Confirm Start Round
        </Button>
      </div>
    </div>
  )
}

export default StartRoundConfirm
