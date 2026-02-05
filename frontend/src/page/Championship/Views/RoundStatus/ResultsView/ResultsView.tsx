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

// Sorts competitors by this round's points (descending) and assigns round finishing positions.
// Competitors with equal points share the same position.
const sortByRoundPoints = (
  competitors: CompetitorEntryType[]
): { entry: CompetitorEntryType; roundPosition: number }[] => {
  const sorted = [...competitors]
    .filter(c => !c.deleted)
    .sort((a, b) => b.points - a.points)

  const result: { entry: CompetitorEntryType; roundPosition: number }[] = []
  let currentPosition = 1

  for (let i = 0; i < sorted.length; i++) {
    // Competitors with the same points share the same position.
    if (i > 0 && sorted[i].points < sorted[i - 1].points) {
      currentPosition = i + 1
    }
    result.push({ entry: sorted[i], roundPosition: currentPosition })
  }

  return result
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

  // Re-number remainder positions starting after the podium (4th+).
  // Competitors with equal points still share the same position within the list.
  const podiumCount = podiumEntries.length
  const sliced = ranked.slice(podiumCount)
  const remainderEntries: typeof sliced = []
  for (let i = 0; i < sliced.length; i++) {
    if (i === 0) {
      remainderEntries.push({ ...sliced[i], roundPosition: podiumCount + 1 })
    } else if (sliced[i].entry.points === sliced[i - 1].entry.points) {
      remainderEntries.push({ ...sliced[i], roundPosition: remainderEntries[i - 1].roundPosition })
    } else {
      remainderEntries.push({ ...sliced[i], roundPosition: podiumCount + 1 + i })
    }
  }

  return (
    <div className="results-view">
      {/* Timer and skip button at the top. */}
      <div className="results-view__header">
        <Timer seconds={secondsLeft} format="minutes" />
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

      <h2>R{round.round} - Results</h2>

      {/* Motorsport-style podium for the top 3 finishers. */}
      {podiumEntries.length > 0 && (
        <Podium
          competitors={podiumEntries}
          rounds={rounds}
          currentRoundIndex={currentRoundIndex}
          onBadgeClick={setSelectedBadge}
        />
      )}

      {/* Competitor results cards for 4th place and below. */}
      {remainderEntries.length > 0 && (
        <div className="results-view__list">
          {remainderEntries.map(({ entry, roundPosition }) => {
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
