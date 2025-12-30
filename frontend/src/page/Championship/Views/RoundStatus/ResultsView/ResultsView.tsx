import React, { useState, useEffect } from "react"
import "./_resultsView.scss"
import { RoundType } from "../../../../../shared/types"

interface ResultsViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onSkipTimer?: () => void
}

// Duration in seconds before auto-transition to completed (5 minutes).
const RESULTS_DURATION = 5 * 60

// Formats seconds into MM:SS display.
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// View displayed when showing the final results of the round.
// Displays qualifying results and points awarded.
const ResultsView: React.FC<ResultsViewProps> = ({ round, isAdjudicator, onSkipTimer }) => {
  const [secondsLeft, setSecondsLeft] = useState(RESULTS_DURATION)

  // Decrement timer every second.
  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  return (
    <div className="results-view">
      <h2>Round {round.round} - Results</h2>
      <p>Final results</p>
      <div className="timer">{formatTime(secondsLeft)}</div>
      {isAdjudicator && onSkipTimer && (
        <button className="skip-timer-btn" onClick={onSkipTimer}>
          Skip Timer
        </button>
      )}
    </div>
  )
}

export default ResultsView
