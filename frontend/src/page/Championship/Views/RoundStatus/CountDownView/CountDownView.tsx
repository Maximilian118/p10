import React, { useState, useEffect } from "react"
import "./_countDownView.scss"
import { RoundType } from "../../../../../shared/types"
import StartLights from "../../../components/StartLights/StartLights"
import Timer from "../../../components/Timer/Timer"
import { Button, IconButton } from "@mui/material"
import Arrows from "../../../../../components/utility/arrows/Arrows"
import CloseIcon from "@mui/icons-material/Close"
import { getCeremonyLightStatus } from "../../../components/StartLights/startLightsUtility"

interface CountDownViewProps {
  round: RoundType
  isAdjudicator?: boolean
  onSkipTimer?: () => void
  countdownDuration?: number  // seconds: 1800 for automated, 30 for manual
  onClose?: () => void
}

// Duration in seconds before auto-transition to betting_open (manual start default).
const COUNTDOWN_DURATION = 30

// Max random delay (5s) + buffer (2s) before showing "stuck" message.
const STUCK_THRESHOLD = 7

// Calculates remaining seconds based on when the countdown started and the total duration.
// Used to sync users who join mid-countdown.
const calculateSecondsLeft = (statusChangedAt: string | null, duration: number): number => {
  if (!statusChangedAt) return duration
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return Math.max(0, duration - elapsed)
}

// Calculates if we've been waiting too long after countdown expired.
const calculateIsStuck = (statusChangedAt: string | null, duration: number): boolean => {
  if (!statusChangedAt) return false
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return elapsed > duration + STUCK_THRESHOLD
}

// Determines the status message based on build-up phase (extended countdown).
const getBuildUpMessage = (secondsLeft: number): string => {
  if (secondsLeft > 2 * 60) return "Get ready..."
  if (secondsLeft > 2 * 60 - 15) return "Formation Lap"
  return "Round starting soon!"
}

// View displayed during the countdown before betting opens.
// Supports both 30s manual countdown and 30-minute extended automated countdown.
const CountDownView: React.FC<CountDownViewProps> = ({
  round, isAdjudicator, onSkipTimer,
  countdownDuration = 30, onClose
}) => {
  const isExtended = countdownDuration > COUNTDOWN_DURATION

  const [secondsLeft, setSecondsLeft] = useState(() =>
    calculateSecondsLeft(round.statusChangedAt, countdownDuration)
  )
  const [isStuck, setIsStuck] = useState(() =>
    calculateIsStuck(round.statusChangedAt, countdownDuration)
  )

  // Single unified timer: tick every second, recompute from statusChangedAt for accuracy.
  useEffect(() => {
    const tick = () => {
      setSecondsLeft(calculateSecondsLeft(round.statusChangedAt, countdownDuration))
      setIsStuck(calculateIsStuck(round.statusChangedAt, countdownDuration))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [round.statusChangedAt, countdownDuration])

  // Non-extended: check if stuck after countdown expires.
  useEffect(() => {
    if (isExtended || secondsLeft > 0 || isStuck) return

    const stuckTimer = setTimeout(() => {
      setIsStuck(true)
    }, STUCK_THRESHOLD * 1000)

    return () => clearTimeout(stuckTimer)
  }, [isExtended, secondsLeft, isStuck])

  // Extended: derive ceremony light status from seconds remaining.
  const ceremonyLightStatus = isExtended ? getCeremonyLightStatus(secondsLeft) : "off"

  // Non-extended: start light sequence in final 5 seconds.
  const shouldStartSequence = !isExtended && secondsLeft <= 5

  // Extended: true after the formation lap green lights end (1:45 remaining).
  // Used to fade out the timer before the backend-driven final 30s.
  const isPostFormationLap = isExtended && secondsLeft <= 105

  // Non-extended: heading/status text fades in final 10 seconds.
  const isTextFading = !isExtended && secondsLeft <= 10 && !isStuck

  // Timer wrapper fading: post-formation-lap for extended, final 10s or stuck for non-extended.
  const isTimerFading = isPostFormationLap || (!isExtended && (secondsLeft <= 10 || isStuck))

  // Timer format: show minutes for extended when >60s, otherwise seconds.
  const timerFormat = isExtended && secondsLeft > 60 ? "minutes" : "seconds"

  // Status message based on current mode.
  const statusMessage = isExtended
    ? getBuildUpMessage(secondsLeft)
    : isStuck
      ? "Waiting for adjudicator..."
      : "Betting window opening soon!"

  return (
    <div className="countdown-view">
      {/* Close button — visible during extended countdown, fades out at 30s remaining */}
      {isExtended && onClose && (
        <IconButton className={`close-btn ${secondsLeft <= 30 ? "fading" : ""}`} onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      )}

      <div className="countdown-top">
        <h2 className={isTextFading ? "fading" : ""}>Round {round.round}</h2>
        <p className={isTextFading ? "fading" : ""}>{statusMessage}</p>
        {/* Extended: show ceremony lights via status prop. Non-extended: show race start sequence. */}
        <StartLights
          status={isExtended ? ceremonyLightStatus : undefined}
          startSequence={shouldStartSequence}
          initialSeconds={!isExtended ? secondsLeft : undefined}
        />
      </div>

      {/* Skip timer button — non-extended mode only, for adjudicators */}
      {!isExtended && isAdjudicator && onSkipTimer && (
        <Button
          variant="outlined"
          className={`skip-timer-btn ${isStuck ? 'stuck' : ''}`}
          endIcon={<Arrows/>}
          onClick={onSkipTimer}>
          Skip Timer
        </Button>
      )}

      {/* Timer display — fades out after formation lap (extended) or during final seconds (non-extended) */}
      <div className={`timer-wrapper ${isTimerFading ? "fading" : ""}`}>
        <Timer
          seconds={secondsLeft}
          format={timerFormat}
        />
      </div>
    </div>
  )
}

export default CountDownView
