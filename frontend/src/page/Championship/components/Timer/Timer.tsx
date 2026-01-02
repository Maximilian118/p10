import React from "react"
import "./_timer.scss"

interface TimerProps {
  seconds: number
  format?: "seconds" | "minutes"
}

// Formats total seconds as MM:SS string.
const formatMinutes = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Displays countdown timer with configurable format.
const Timer: React.FC<TimerProps> = ({ seconds, format = "seconds" }) => {
  const display = format === "minutes" ? formatMinutes(seconds) : `${seconds}`

  return (
    <div className="timer">{display}</div>
  )
}

export default Timer
