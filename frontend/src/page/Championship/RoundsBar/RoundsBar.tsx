import React from "react"
import "./_roundsBar.scss"
import { ToggleButton, ToggleButtonGroup } from "@mui/material"
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft"
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import GroupsIcon from "@mui/icons-material/Groups"
import CloseIcon from "@mui/icons-material/Close"

export type StandingsView = "competitors" | "drivers" | "teams"

interface RoundsBarProps {
  totalRounds: number
  viewedRoundIndex: number
  currentRoundIndex: number
  standingsView: StandingsView
  setViewedRoundIndex: (index: number | null) => void
  setStandingsView: (view: StandingsView) => void
  isAdjudicator: boolean
  onStartNextRound?: () => void
}

// Navigation bar for browsing championship rounds and switching between standings views.
const RoundsBar: React.FC<RoundsBarProps> = ({
  totalRounds,
  viewedRoundIndex,
  currentRoundIndex,
  standingsView,
  setViewedRoundIndex,
  setStandingsView,
  isAdjudicator,
  onStartNextRound,
}) => {
  const isViewingCurrent = viewedRoundIndex === currentRoundIndex
  const canGoBack = viewedRoundIndex > 0
  const canGoForward = !isViewingCurrent

  // Navigate to previous round.
  const handlePrevRound = () => {
    if (canGoBack) {
      setViewedRoundIndex(viewedRoundIndex - 1)
    }
  }

  // Navigate to next round or return to current.
  const handleNextRound = () => {
    if (canGoForward) {
      const nextIndex = viewedRoundIndex + 1
      // If reaching current, set to null to indicate "current"
      setViewedRoundIndex(nextIndex >= currentRoundIndex ? null : nextIndex)
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
    if (!isViewingCurrent) {
      // Viewing historical round - show forward arrow
      return (
        <ToggleButton
          value="forward"
          className="rounds-bar-nav-btn"
          onClick={handleNextRound}
        >
          <KeyboardArrowRightIcon />
        </ToggleButton>
      )
    }

    if (isAdjudicator) {
      // Adjudicator at current round - show start next round button
      return (
        <ToggleButton
          value="start"
          className="rounds-bar-nav-btn rounds-bar-start-btn"
          onClick={handleStartNextRound}
        >
          <img
            src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/favicon.png"
            alt="Start"
            className="rounds-bar-favicon"
          />
          <KeyboardArrowRightIcon className="rounds-bar-start-arrow" />
        </ToggleButton>
      )
    }

    // Non-adjudicator at current round - show disabled close icon
    return (
      <ToggleButton
        value="close"
        className="rounds-bar-nav-btn"
        disabled
      >
        <CloseIcon />
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
        <KeyboardArrowLeftIcon />
      </ToggleButton>

      {/* Buttons 2-4: Standings view toggle */}
      <ToggleButtonGroup
        value={standingsView}
        exclusive
        onChange={handleViewChange}
        className="rounds-bar-toggle-group"
      >
        <ToggleButton value="competitors" className="rounds-bar-view-btn">
          <EmojiEventsIcon />
        </ToggleButton>
        <ToggleButton value="drivers" className="rounds-bar-view-btn">
          <SportsMotorsportsIcon />
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
