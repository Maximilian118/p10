import React, { useState, useEffect } from "react"
import "./_championshipFinishView.scss"
import { CompetitorEntryType } from "../../../../../shared/types"
import { getCompetitorName, getCompetitorIcon, getCompetitorId } from "../../../../../shared/utility"
import ImageIcon from "../../../../../components/utility/icon/imageIcon/ImageIcon"
import Podium from "../ResultsView/Podium/Podium"
import { Button } from "@mui/material"
import { ArrowForward } from "@mui/icons-material"

interface ChampionshipFinishViewProps {
  seasonEndStandings: CompetitorEntryType[] // Final standings from archived season
  season: number // Which season just ended
  seasonEndedAt: string | null // For 24h countdown
  onSkip: () => void // Dismiss the view
}

// Duration in seconds for the championship finish view (24 hours).
const FINISH_VIEW_DURATION = 24 * 60 * 60

// Calculates remaining seconds based on when the season ended.
const calculateSecondsLeft = (seasonEndedAt: string | null): number => {
  if (!seasonEndedAt) return FINISH_VIEW_DURATION
  const elapsed = Math.floor((Date.now() - new Date(seasonEndedAt).getTime()) / 1000)
  return Math.max(0, FINISH_VIEW_DURATION - elapsed)
}

// Formats total seconds as HH:MM:SS string.
const formatCountdown = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Sorts competitors by grandTotalPoints descending for final championship standings.
const sortByStandings = (competitors: CompetitorEntryType[]): CompetitorEntryType[] => {
  return [...competitors]
    .filter(c => !c.deleted)
    .sort((a, b) => {
      if (b.grandTotalPoints !== a.grandTotalPoints) return b.grandTotalPoints - a.grandTotalPoints
      return a.position - b.position
    })
}

// Celebratory end-of-season view replacing ResultsView for the final round.
// Shows the champion prominently, podium for top 3, and full final standings.
const ChampionshipFinishView: React.FC<ChampionshipFinishViewProps> = ({
  seasonEndStandings, season, seasonEndedAt, onSkip,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(seasonEndedAt))

  // Decrement timer every second. Auto-dismiss when countdown reaches 0.
  useEffect(() => {
    if (secondsLeft <= 0) {
      onSkip()
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        const next = Math.max(0, prev - 1)
        if (next === 0) onSkip()
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, onSkip])

  const sorted = sortByStandings(seasonEndStandings)
  const champion = sorted[0]
  const podiumEntries = sorted.slice(0, 3)
  const remainingEntries = sorted.slice(3)

  if (!champion) return null

  return (
    <div className="championship-finish">
      {/* Gold gradient wash at the top for atmosphere. */}
      <div className="championship-finish__glow" />

      {/* Header with countdown and skip button. */}
      <div className="championship-finish__header">
        <div className="championship-finish__countdown">
          {formatCountdown(secondsLeft)}
        </div>
        <Button
          className="championship-finish__skip"
          onClick={onSkip}
          endIcon={<ArrowForward />}
          size="small"
        >
          Skip
        </Button>
      </div>

      {/* Season title. */}
      <div className="championship-finish__title">
        <p className="championship-finish__label">Season {season}</p>
        <h1 className="championship-finish__heading">Champion</h1>
      </div>

      {/* Champion hero section — the winner displayed prominently. */}
      <div className="championship-finish__champion">
        <div className="championship-finish__champion-ring">
          <ImageIcon src={getCompetitorIcon(champion)} size="xx-large" />
        </div>
        <h2 className="championship-finish__champion-name">
          {getCompetitorName(champion)}
        </h2>
        <p className="championship-finish__champion-points">
          {champion.grandTotalPoints} pts
        </p>
      </div>

      {/* Podium for the top 3 finishers. */}
      <Podium competitors={podiumEntries} />

      {/* Full final standings for remaining competitors. */}
      {remainingEntries.length > 0 && (
        <div className="championship-finish__standings">
          <h3 className="championship-finish__standings-title">Final Standings</h3>
          {remainingEntries.map((entry, idx) => {
            const position = idx + 4
            return (
              <div key={getCompetitorId(entry)} className="championship-finish__standing-row">
                <span className="championship-finish__standing-pos">{position}</span>
                <ImageIcon src={getCompetitorIcon(entry)} size="small" />
                <span className="championship-finish__standing-name">
                  {getCompetitorName(entry)}
                </span>
                <span className="championship-finish__standing-pts">
                  {entry.grandTotalPoints} pts
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChampionshipFinishView
