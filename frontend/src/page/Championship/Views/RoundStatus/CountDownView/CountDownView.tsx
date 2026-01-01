import React, { useState, useEffect } from "react"
import "./_countDownView.scss"
import { RoundType } from "../../../../../shared/types"
import StartLights from "../../../components/StartLights/StartLights"

interface CountDownViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onSkipTimer?: () => void
}

// Duration in seconds before auto-transition to betting_open.
const COUNTDOWN_DURATION = 30

// View displayed during the 30s countdown before betting opens.
const CountDownView: React.FC<CountDownViewProps> = ({ round, isAdjudicator, onSkipTimer }) => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_DURATION)

  // Decrement timer every second.
  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  return (
    <div className="countdown-view">
      <div className="countdown-top">
        <h2>Round {round.round}</h2>
        <p>Betting window opening soon!</p>
        <StartLights status="default"/>
      </div>
      <div className="timer">{secondsLeft}s</div>
      {isAdjudicator && onSkipTimer && (
        <button className="skip-timer-btn" onClick={onSkipTimer}>
          Skip Timer
        </button>
      )}
    </div>
  )
}

export default CountDownView
