import React from "react"
import './_statusLabel.scss'

interface StatusLabelProp {
  text: string
  colour?: "default" | "error" | "success"
  className?: string
}

// Displays a styled label with configurable colour and optional custom class.
const StatusLabel: React.FC<StatusLabelProp> = ({ text, colour = "default", className }) => {
  return (
    <span className={`status-label status-label--${colour}${className ? ` ${className}` : ""}`}>
      {text}
    </span>
  )
}

export default StatusLabel
