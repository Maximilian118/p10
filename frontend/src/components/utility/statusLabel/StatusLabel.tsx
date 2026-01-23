import React from "react"
import './_statusLabel.scss'

interface StatusLabelProp {
  text: string
  colour?: "default" | "error" | "success"
}

const StatusLabel: React.FC<StatusLabelProp> = ({ text, colour = "default" }) => {
  return (
    <span className={`status-label status-label--${colour}`}>
      {text}
    </span>
  )
}

export default StatusLabel
