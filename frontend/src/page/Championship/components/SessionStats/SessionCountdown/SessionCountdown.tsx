import React from "react"
import "./_sessionCountdown.scss"

interface SessionCountdownProps {
  remainingMs: number
  size?: number
}

// Formats milliseconds as HH:MM:SS.
const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Displays a countdown timer formatted as HH:MM:SS.
// Pure display component — receives remaining time in ms, renders formatted time.
// Optional size prop overrides the default font size (px).
const SessionCountdown: React.FC<SessionCountdownProps> = ({ remainingMs, size }) => {
  return (
    <span className="session-countdown" style={size ? { fontSize: size } : undefined}>
      {formatCountdown(remainingMs)}
    </span>
  )
}

export default SessionCountdown
