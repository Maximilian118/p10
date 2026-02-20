import React from "react"
import "./_prompt.scss"
import { Button, CircularProgress } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"

interface PromptProps {
  text: string
  icon?: React.ReactNode
  buttonText?: string
  buttonOnClick?: () => void
  buttonLoading?: boolean
  onDismiss?: () => void
}

// Reusable prompt banner with optional icon, action button, and dismiss control.
const Prompt: React.FC<PromptProps> = ({ text, icon, buttonText, buttonOnClick, buttonLoading, onDismiss }) => {
  return (
    <div className="prompt">
      <div className="prompt__content">
        {icon && <span className="prompt__icon">{icon}</span>}
        <p className="prompt__text">{text}</p>
      </div>
      <div className="prompt__actions">
        {buttonText && buttonOnClick && (
          <Button
            variant="contained"
            size="small"
            onClick={buttonOnClick}
            disabled={buttonLoading}
          >
            {buttonLoading ? <CircularProgress size={18} color="inherit" /> : buttonText}
          </Button>
        )}
        {onDismiss && (
          <button className="prompt__dismiss" onClick={onDismiss}>
            <CloseIcon fontSize="small" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Prompt
