import React, { useState, useEffect } from "react"
import "./_resultsView.scss"
import { CompetitorEntryType, RoundType, badgeType } from "../../../../../shared/types"
import { isBestRound, getCompetitorId } from "../../../../../shared/utility"
import FillLoading from "../../../../../components/utility/fillLoading/FillLoading"
import Timer from "../../../components/Timer/Timer"
import Podium from "./Podium/Podium"
import CompetitorResultsCard from "./CompetitorResultsCard/CompetitorResultsCard"
import BadgeModal from "../../../../../components/modal/configs/BadgeModal/BadgeModal"
import { Button } from "@mui/material"
import { ArrowForward } from "@mui/icons-material"

interface ResultsViewProps {
  round: RoundType
  rounds: RoundType[] // All rounds this season (for "Best!" calculation).
  currentRoundIndex: number
  isAdjudicator?: boolean
  onSkipTimer?: () => void
}

// Duration in seconds before auto-transition to completed (5 minutes).
const RESULTS_DURATION = 5 * 60

// Calculates remaining seconds based on when results started.
// Used to sync users who join mid-results or after reconnection.
const calculateSecondsLeft = (statusChangedAt: string | null): number => {
  if (!statusChangedAt) return RESULTS_DURATION
  const elapsed = Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / 1000)
  return Math.max(0, RESULTS_DURATION - elapsed)
}

// Checks whether results data has been loaded (points calculated, badges populated).
// resultsHandler always initialises badgesAwarded as an array (empty or populated).
// Before processing, the field is undefined — so Array.isArray detects that results
// have been processed, even if all competitors scored 0 points.
const hasResultsData = (competitors: CompetitorEntryType[]): boolean => {
  if (competitors.length === 0) return false
  return competitors.some(c => c.points > 0 || Array.isArray(c.badgesAwarded))
}

// Sorts competitors by round points (descending), breaking ties by championship standing.
// Each competitor gets a unique sequential position.
const sortByRoundPoints = (
  competitors: CompetitorEntryType[]
): { entry: CompetitorEntryType; roundPosition: number }[] => {
  const sorted = [...competitors]
    .filter(c => !c.deleted)
    .sort((a, b) => {
      // Primary: round points descending.
      if (b.points !== a.points) return b.points - a.points
      // Tiebreaker: championship total points descending.
      return b.grandTotalPoints - a.grandTotalPoints
    })

  // Assign unique sequential positions (1st, 2nd, 3rd, ...).
  return sorted.map((entry, i) => ({ entry, roundPosition: i + 1 }))
}

// Displays round results: podium for top 3, cards for remaining competitors, countdown timer.
const ResultsView: React.FC<ResultsViewProps> = ({
  round, rounds, currentRoundIndex, onSkipTimer,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(round.statusChangedAt))
  const [selectedBadge, setSelectedBadge] = useState<badgeType | null>(null)

  // Decrement timer every second.
  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  // Show loading spinner until results data is available (non-adjudicators refetch via socket).
  if (!hasResultsData(round.competitors)) {
    return <FillLoading />
  }

  // Sort competitors by this round's points and compute round finishing positions.
  const ranked = sortByRoundPoints(round.competitors)

  // Split into podium (top 3) and remaining competitors.
  const podiumEntries = ranked.slice(0, 3).map(r => r.entry)

  return (
    <div className="results-view">
      {/* Timer and skip button at the top. */}
      <div className="results-view__header">
        <Timer seconds={secondsLeft} format="minutes" />
        <h2>Results</h2>
        {onSkipTimer && (
          <Button 
            className="skip-btn"
            onClick={onSkipTimer}
            endIcon={<ArrowForward/>}
            size="small"
          >
            Skip
          </Button>
        )}
      </div>

      {/* Motorsport-style podium for the top 3 finishers. */}
      {podiumEntries.length > 0 && <Podium competitors={podiumEntries}/>}

      {/* Competitor results cards for all finishers. */}
      {ranked.length > 0 && (
        <div className="results-view__list">
          {ranked.map(({ entry, roundPosition }) => {
            const competitorId = getCompetitorId(entry)
            return (
              <CompetitorResultsCard
                key={competitorId}
                entry={entry}
                roundPosition={roundPosition}
                isBest={competitorId ? isBestRound(rounds, competitorId, currentRoundIndex) : false}
                onBadgeClick={setSelectedBadge}
              />
            )
          })}
        </div>
      )}

      {/* Badge detail modal — opens when a badge is clicked. */}
      {selectedBadge && (
        <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  )
}

export default ResultsView
