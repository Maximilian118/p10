import React, { useState, useEffect } from "react"
import "./_roundsBar.scss"
import { ToggleButton, ToggleButtonGroup } from "@mui/material"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import Arrows from "../../../../components/utility/arrows/Arrows"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import GroupsIcon from "@mui/icons-material/Groups"
import { AccessTime } from "@mui/icons-material"

export type StandingsView = "competitors" | "drivers" | "teams"

interface RoundsBarProps {
  totalRounds: number
  completedRounds: number // Number of completed rounds (0 = pre-season).
  viewedRoundIndex: number
  standingsView: StandingsView
  setViewedRoundIndex: (index: number | null) => void
  setStandingsView: (view: StandingsView) => void
  isAdjudicator: boolean
  onStartNextRound?: () => void
  autoOpenTimestamp?: string // ISO timestamp of the next qualifying session start.
  autoOpenTime?: number // Minutes before qualifying to auto-open betting.
}

// Formats milliseconds into HH:MM:SS countdown string.
const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "00:00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Threshold-based human-readable label for time periods longer than 24h.
const formatRoughCountdown = (ms: number): string => {
  const days = ms / (24 * 60 * 60 * 1000)
  if (days >= 120) return "4 Months"
  if (days >= 60) return "2 Months"
  if (days >= 30) return "1 Month"
  if (days >= 14) return "2 Weeks"
  if (days >= 7) return "1 Week"
  if (days >= 4) return "4 Days"
  if (days >= 2) return "2 Days"
  return "1 Day"
}

const ONE_HOUR = 60 * 60 * 1000
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

// Navigation bar for browsing championship rounds and switching between standings views.
const RoundsBar: React.FC<RoundsBarProps> = ({
  totalRounds,
  completedRounds,
  viewedRoundIndex,
  standingsView,
  setViewedRoundIndex,
  setStandingsView,
  isAdjudicator,
  onStartNextRound,
  autoOpenTimestamp,
  autoOpenTime,
}) => {
  const [countdown, setCountdown] = useState<string | null>(null)
  const [roughCountdown, setRoughCountdown] = useState<string | null>(null)
  const [canStart, setCanStart] = useState(false)

  // Countdown timer: computes display state based on time until auto-open.
  useEffect(() => {
    if (!autoOpenTimestamp || !autoOpenTime) {
      setCountdown(null)
      setRoughCountdown(null)
      setCanStart(false)
      return
    }

    const qualifyingStart = new Date(autoOpenTimestamp).getTime()
    const autoOpenAt = qualifyingStart - (autoOpenTime * 60 * 1000)

    // Compute countdown state based on time remaining.
    const tick = () => {
      const msUntilOpen = autoOpenAt - Date.now()

      if (msUntilOpen <= 0) {
        // Auto-open time has passed — round should be starting.
        setCountdown(null)
        setRoughCountdown(null)
        setCanStart(false)
      } else if (msUntilOpen <= ONE_HOUR) {
        // Within 1h — precise countdown, adjudicator can start.
        setCountdown(formatCountdown(msUntilOpen))
        setRoughCountdown(null)
        setCanStart(true)
      } else if (msUntilOpen <= TWENTY_FOUR_HOURS) {
        // 1h–24h — precise countdown, but no start yet.
        setCountdown(formatCountdown(msUntilOpen))
        setRoughCountdown(null)
        setCanStart(false)
      } else {
        // >24h — rough label only.
        setCountdown(null)
        setRoughCountdown(formatRoughCountdown(msUntilOpen))
        setCanStart(false)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [autoOpenTimestamp, autoOpenTime])

  // Navigation constraints - can only view completed rounds.
  const lastCompletedIndex = Math.max(0, completedRounds - 1)
  const canGoBack = viewedRoundIndex > 0
  const canGoForward = completedRounds > 0 && viewedRoundIndex < lastCompletedIndex

  // Navigate to previous round.
  const handlePrevRound = () => {
    if (canGoBack) {
      setViewedRoundIndex(viewedRoundIndex - 1)
    }
  }

  // Navigate to next completed round.
  const handleNextRound = () => {
    if (canGoForward) {
      const nextIndex = viewedRoundIndex + 1
      // If reaching latest completed, set to null to indicate "latest".
      setViewedRoundIndex(nextIndex >= lastCompletedIndex ? null : nextIndex)
    }
  }

  // Handle adjudicator's start next round action.
  const handleStartNextRound = () => {
    if (onStartNextRound) {
      onStartNextRound()
    }
  }

  // Handle standings view change from toggle group.
  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: StandingsView | null) => {
    if (newView !== null) {
      setStandingsView(newView)
    }
  }

  // Whether there are still rounds to play.
  const hasRoundsRemaining = completedRounds < totalRounds

  // Determine button 5 state and content.
  const renderRightButton = () => {
    // Can navigate forward to more completed rounds.
    if (canGoForward) {
      return (
        <ToggleButton
          value="forward"
          className="rounds-bar-nav-btn"
          onClick={handleNextRound}
        >
          <Arrows />
        </ToggleButton>
      )
    }

    // >24h away — show rough label with clock icon for all users.
    if (roughCountdown && hasRoundsRemaining) {
      return (
        <ToggleButton
          value="waiting"
          className="rounds-bar-nav-btn rounds-bar-countdown-btn"
          disabled
        >
          <p>{roughCountdown}</p>
          <AccessTime />
        </ToggleButton>
      )
    }

    // 1h–24h — show HH:MM:SS countdown disabled for all users (no start yet).
    if (countdown && !canStart && hasRoundsRemaining) {
      return (
        <ToggleButton
          value="countdown"
          className="rounds-bar-nav-btn rounds-bar-countdown-btn"
          disabled
        >
          <p>{countdown}</p>
        </ToggleButton>
      )
    }

    // <1h — adjudicator can start with countdown.
    if (isAdjudicator && canStart && hasRoundsRemaining) {
      return (
        <ToggleButton
          value="start"
          className="rounds-bar-nav-btn rounds-bar-start-btn"
          onClick={handleStartNextRound}
        >
          <p>{countdown}</p>
          <Arrows />
        </ToggleButton>
      )
    }

    // Adjudicator at latest completed round — non-API series or no timestamp (manual start).
    if (isAdjudicator && hasRoundsRemaining) {
      return (
        <ToggleButton
          value="start"
          className="rounds-bar-nav-btn rounds-bar-start-btn"
          onClick={handleStartNextRound}
        >
          <p>Start</p>
          <Arrows />
        </ToggleButton>
      )
    }

    // <1h — non-adjudicator sees disabled countdown.
    if (hasRoundsRemaining && countdown) {
      return (
        <ToggleButton
          value="countdown"
          className="rounds-bar-nav-btn rounds-bar-countdown-btn"
          disabled
        >
          <p>{countdown}</p>
        </ToggleButton>
      )
    }

    // Default — all rounds done or no timestamp for non-adjudicator.
    return (
      <ToggleButton
        value="close"
        className="rounds-bar-nav-btn"
        disabled
      >
        <AccessTime />
      </ToggleButton>
    )
  }

  return (
    <div className="rounds-bar">
      {/* Button 1: Navigate back */}
      <ToggleButton
        value="back"
        className="rounds-bar-nav-btn"
        onClick={handlePrevRound}
        disabled={!canGoBack}
      >
        <Arrows direction="left"/>
      </ToggleButton>

      {/* Buttons 2-4: Standings view toggle */}
      <ToggleButtonGroup
        value={standingsView}
        exclusive
        onChange={handleViewChange}
        className="rounds-bar-toggle-group"
      >
        <ToggleButton value="drivers" className="rounds-bar-view-btn">
          <SportsMotorsportsIcon />
        </ToggleButton>
        <ToggleButton value="competitors" className="rounds-bar-view-btn">
          <EmojiEventsIcon />
        </ToggleButton>
        <ToggleButton value="teams" className="rounds-bar-view-btn">
          <GroupsIcon />
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Button 5: Navigate forward / Countdown / Start next round / Close */}
      {renderRightButton()}
    </div>
  )
}

export default RoundsBar
