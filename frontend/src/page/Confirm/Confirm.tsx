import React from "react"
import "./_confirm.scss"
import { Button } from "@mui/material"

interface ConfirmProps {
  variant: "danger" | "success"
  icon: React.ReactNode
  heading: string
  paragraphs: string[]
  cancelText: string
  confirmText: string
  onCancel: () => void
  onConfirm: () => void
}

// Reusable confirmation view for actions requiring user confirmation.
const Confirm: React.FC<ConfirmProps> = ({
  variant,
  icon,
  heading,
  paragraphs,
  cancelText,
  confirmText,
  onCancel,
  onConfirm
}) => {
  return (
    <div className={`confirm confirm--${variant}`}>
      <div className="confirm__header">
        <span className="confirm__icon">{icon}</span>
        <h2>{heading}</h2>
      </div>
      <div className="confirm__content">
        {paragraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </div>
      <div className="confirm__actions">
        <Button
          variant="outlined"
          onClick={onCancel}
          className="confirm__btn confirm__btn--cancel"
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          className="confirm__btn confirm__btn--confirm"
        >
          {confirmText}
        </Button>
      </div>
    </div>
  )
}

export default Confirm
