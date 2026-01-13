import React from "react"
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
}) => {
  // Navigation constraints - can only view completed rounds.
  const lastCompletedIndex = Math.max(0, completedRounds - 1)
  const isAtLatestCompleted = viewedRoundIndex >= lastCompletedIndex
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
          <p>Start</p>
          <Arrows />
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
