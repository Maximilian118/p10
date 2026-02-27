import React, { useEffect, useState } from "react"
import "./_leagueResultsView.scss"
import { LeagueMemberType } from "../../../../shared/types"
import { effectiveAvg } from "../../../../shared/leagueUtils"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import StyledText from "../../../../components/utility/styledText/StyledText"

interface LeagueResultsViewProps {
  seasonEndStandings: LeagueMemberType[]
  season: number
  seasonEndedAt: string
  onSkip: () => void
}

// Calculates seconds remaining in the 24-hour results window.
const calculateSecondsLeft = (seasonEndedAt: string): number => {
  const twentyFourHoursMs = 24 * 60 * 60 * 1000
  const endTime = new Date(seasonEndedAt).getTime() + twentyFourHoursMs
  return Math.max(0, Math.floor((endTime - Date.now()) / 1000))
}

// Formats seconds into HH:MM:SS countdown string.
const formatCountdown = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Full-page results view for a completed league season (shown for 24h after season ends).
const LeagueResultsView: React.FC<LeagueResultsViewProps> = ({
  seasonEndStandings,
  season,
  seasonEndedAt,
  onSkip,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(seasonEndedAt))

  // Countdown timer — auto-dismiss when 24h window expires.
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateSecondsLeft(seasonEndedAt)
      setSecondsLeft(remaining)
      if (remaining <= 0) onSkip()
    }, 1000)
    return () => clearInterval(interval)
  }, [seasonEndedAt, onSkip])

  // Sort active standings by effective average (same logic as backend).
  const active = seasonEndStandings
    .filter((m) => m.active && m.championship)
    .sort((a, b) => {
      const aEff = effectiveAvg(a.cumulativeAverage, a.missedRounds)
      const bEff = effectiveAvg(b.cumulativeAverage, b.missedRounds)
      if (bEff !== aEff) return bEff - aEff
      return b.roundsCompleted - a.roundsCompleted
    })

  const champion = active[0]
  const runnerUp = active[1]
  const third = active[2]
  const rest = active.slice(3)

  return (
    <div className="league-results">
      {/* Header with countdown and skip button. */}
      <div className="league-results__header">
        <span className="league-results__countdown">{formatCountdown(secondsLeft)}</span>
        <button className="league-results__skip" onClick={onSkip}>Skip</button>
      </div>

      {/* Season label. */}
      <p className="league-results__season-label">Season {season}</p>
      <h2 className="league-results__title">Champion</h2>

      {/* Champion hero section with gold glow. */}
      {champion && (
        <div className="league-results__champion">
          <div className="league-results__champion-glow" />
          <div className="league-results__champion-icon">
            <ImageIcon src={champion.championship?.icon || ""} size="xx-large" />
          </div>
          <h3 className="league-results__champion-name">{champion.championship?.name}</h3>
          <StyledText text={`${effectiveAvg(champion.cumulativeAverage, champion.missedRounds).toFixed(1)}%`} color="gold" />
          {champion.missedRounds > 0 && (
            <span className="league-results__penalty">-{champion.missedRounds * 5}% penalty</span>
          )}
          <span className="league-results__champion-rounds">
            {champion.roundsCompleted} rounds completed
          </span>
        </div>
      )}

      {/* Podium — 2nd and 3rd place. */}
      {(runnerUp || third) && (
        <div className="league-results__podium">
          {runnerUp && (
            <div className="league-results__podium-slot league-results__podium-slot--2nd">
              <ImageIcon src={runnerUp.championship?.icon || ""} size="large" />
              <p className="league-results__podium-name">{runnerUp.championship?.name}</p>
              <StyledText text="2nd" color="silver" />
              <span className="league-results__podium-avg">{effectiveAvg(runnerUp.cumulativeAverage, runnerUp.missedRounds).toFixed(1)}%</span>
            </div>
          )}
          {third && (
            <div className="league-results__podium-slot league-results__podium-slot--3rd">
              <ImageIcon src={third.championship?.icon || ""} size="large" />
              <p className="league-results__podium-name">{third.championship?.name}</p>
              <StyledText text="3rd" color="bronze" />
              <span className="league-results__podium-avg">{effectiveAvg(third.cumulativeAverage, third.missedRounds).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Remaining standings (4th place onwards). */}
      {rest.length > 0 && (
        <div className="league-results__standings">
          <h3 className="league-results__standings-title">Final Standings</h3>
          {rest.map((member, idx) => (
            <div key={member.championship?._id} className="league-results__standing-row">
              <span className="league-results__standing-pos">{idx + 4}th</span>
              <ImageIcon src={member.championship?.icon || ""} size="small" />
              <span className="league-results__standing-name">{member.championship?.name}</span>
              {member.missedRounds > 0 && (
                <span className="league-results__standing-penalty">-{member.missedRounds * 5}%</span>
              )}
              <span className="league-results__standing-avg">{effectiveAvg(member.cumulativeAverage, member.missedRounds).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LeagueResultsView
