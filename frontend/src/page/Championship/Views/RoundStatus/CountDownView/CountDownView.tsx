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

// Max random delay (5s) + buffer (2s) before showing "stuck" message.
const STUCK_THRESHOLD = 7

// Calculates remaining seconds based on when the countdown started.
// Used to sync users who join mid-countdown.
const calculateSecondsLeft = (statusChangedAt: string | null): number => {
  if (!statusChangedAt) return COUNTDOWN_DURATION
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return Math.max(0, COUNTDOWN_DURATION - elapsed)
}

// Calculates if we've been waiting too long after countdown expired.
const calculateIsStuck = (statusChangedAt: string | null): boolean => {
  if (!statusChangedAt) return false
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return elapsed > COUNTDOWN_DURATION + STUCK_THRESHOLD
}

// View displayed during the 30s countdown before betting opens.
const CountDownView: React.FC<CountDownViewProps> = ({ round, isAdjudicator, onSkipTimer }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(round.statusChangedAt))
  const [isStuck, setIsStuck] = useState(() => calculateIsStuck(round.statusChangedAt))

  // Determines if UI elements should fade (at 10s remaining), but not if stuck.
  const isFading = secondsLeft <= 10 && !isStuck

  // Determines if the start light sequence should begin (at 5s remaining).
  const shouldStartSequence = secondsLeft <= 5

  // Decrement timer every second.
  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  // Check if stuck after countdown expires.
  useEffect(() => {
    if (secondsLeft > 0 || isStuck) return

    const stuckTimer = setTimeout(() => {
      setIsStuck(true)
    }, STUCK_THRESHOLD * 1000)

    return () => clearTimeout(stuckTimer)
  }, [secondsLeft, isStuck])

  // Message to display - changes when stuck.
  const statusMessage = isStuck ? "Waiting for adjudicator..." : "Betting window opening soon!"

  return (
    <div className="countdown-view">
      <div className="countdown-top">
        <h2 className={isFading ? "fading" : ""}>Round {round.round}</h2>
        <p className={isFading ? "fading" : ""}>{statusMessage}</p>
        <StartLights startSequence={shouldStartSequence} initialSeconds={secondsLeft}/>
      </div>
      <div className={`timer ${isFading || isStuck ? "fading" : ""}`}>{secondsLeft}s</div>
      {isAdjudicator && onSkipTimer && (
        <button className="skip-timer-btn" onClick={onSkipTimer}>
          Skip Timer
        </button>
      )}
    </div>
  )
}

export default CountDownView
