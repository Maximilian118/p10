import React from "react"
import "./_closeBettingConfirm.scss"
import { Button } from "@mui/material"
import WarningIcon from "@mui/icons-material/Warning"

interface CloseBettingConfirmProps {
  onCancel: () => void
  onConfirm: () => void
}

// Confirmation view shown when adjudicator tries to close betting early.
const CloseBettingConfirm: React.FC<CloseBettingConfirmProps> = ({
  onCancel,
  onConfirm
}) => {
  return (
    <div className="close-betting-confirm">
      <div className="close-betting-confirm__warning">
        <WarningIcon className="close-betting-confirm__icon" />
        <h2>Close Betting Early?</h2>
      </div>
      <div className="close-betting-confirm__content">
        <p>
          Not all competitors have placed their bets yet.
        </p>
        <p>
          Closing betting now will lock in the current state.
        </p>
      </div>
      <div className="close-betting-confirm__actions">
        <Button
          variant="outlined"
          onClick={onCancel}
          className="close-betting-confirm__btn close-betting-confirm__btn--cancel"
        >
          Go Back
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          className="close-betting-confirm__btn close-betting-confirm__btn--confirm"
        >
          Confirm Close Betting
        </Button>
      </div>
    </div>
  )
}

export default CloseBettingConfirm
