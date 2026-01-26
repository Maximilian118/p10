import React from "react"
import './_statusLabel.scss'

interface StatusLabelProp {
  text: string
  colour?: "default" | "error" | "success" | "highlight"
  className?: string
  fontSize?: number
}

// Displays a styled label with configurable colour and optional custom class.
const StatusLabel: React.FC<StatusLabelProp> = ({ text, colour = "default", className, fontSize }) => {
  return (
    <span className={`status-label status-label--${colour}${className ? ` ${className}` : ""}`} style={{ fontSize: fontSize }}>
      {text}
    </span>
  )
}

export default StatusLabel
