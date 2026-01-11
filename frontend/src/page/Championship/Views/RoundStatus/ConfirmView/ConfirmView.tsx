import React from "react"
import "./_confirmView.scss"
import { Button } from "@mui/material"

interface ConfirmViewProps {
  variant: "danger" | "success"
  icon: React.ReactNode
  heading: string
  paragraphs: string[]
  cancelText: string
  confirmText: string
  onCancel: () => void
  onConfirm: () => void
}

// Reusable confirmation view for adjudicator actions.
const ConfirmView: React.FC<ConfirmViewProps> = ({
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
    <div className={`confirm-view confirm-view--${variant}`}>
      <div className="confirm-view__header">
        <span className="confirm-view__icon">{icon}</span>
        <h2>{heading}</h2>
      </div>
      <div className="confirm-view__content">
        {paragraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </div>
      <div className="confirm-view__actions">
        <Button
          variant="outlined"
          onClick={onCancel}
          className="confirm-view__btn confirm-view__btn--cancel"
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          className="confirm-view__btn confirm-view__btn--confirm"
        >
          {confirmText}
        </Button>
      </div>
    </div>
  )
}

export default ConfirmView
