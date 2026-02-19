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

  // Countdown timer: shows HH:MM:SS when within 24h of auto-open time.
  useEffect(() => {
    if (!autoOpenTimestamp || !autoOpenTime) {
      setCountdown(null)
      return
    }

    const qualifyingStart = new Date(autoOpenTimestamp).getTime()
    const autoOpenAt = qualifyingStart - (autoOpenTime * 60 * 1000)

    // Update countdown every second.
    const tick = () => {
      const msUntilOpen = autoOpenAt - Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      if (msUntilOpen <= 0) {
        // Auto-open time has passed — round should be starting.
        setCountdown(null)
      } else if (msUntilOpen <= twentyFourHours) {
        // Within 24h — show countdown.
        setCountdown(formatCountdown(msUntilOpen))
      } else {
        // More than 24h — no countdown yet.
        setCountdown(null)
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

    // At latest completed round - adjudicator can start next round if more rounds exist.
    if (isAdjudicator && completedRounds < totalRounds) {
      return (
        <ToggleButton
          value="start"
          className="rounds-bar-nav-btn rounds-bar-start-btn"
          onClick={handleStartNextRound}
        >
          {/* Show countdown when within 24h, otherwise show "Start" */}
          <p>{countdown || "Start"}</p>
          <Arrows />
        </ToggleButton>
      )
    }

    // Non-adjudicator at latest completed round — show countdown or waiting icon.
    if (completedRounds < totalRounds && countdown) {
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

    // Non-adjudicator at latest completed round or all rounds done - show waiting/done icon.
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

      {/* Button 5: Navigate forward / Start next round / Close */}
      {renderRightButton()}
    </div>
  )
}

export default RoundsBar
