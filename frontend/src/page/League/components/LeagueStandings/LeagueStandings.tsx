import React from "react"
import "./_leagueStandings.scss"
import { LeagueMemberType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"

interface leagueStandingsType {
  championships: LeagueMemberType[]
  onChampClick?: (champId: string) => void
}

// Returns a position label — medal emoji for top 3, number for the rest.
const positionLabel = (pos: number): string => {
  if (pos === 1) return "1st"
  if (pos === 2) return "2nd"
  if (pos === 3) return "3rd"
  return `${pos}th`
}

// Computes the effective average after applying the 5% missed-round penalty.
const effectiveAvg = (member: LeagueMemberType): number => {
  return Math.max(0, member.cumulativeAverage - (member.missedRounds || 0) * 5)
}

// Head-to-head championship comparison. Adapts layout for 2 (VS) vs 3+ (ranked bars).
const LeagueStandings: React.FC<leagueStandingsType> = ({ championships, onChampClick }) => {
  // Filter and sort active championships by position.
  const active = championships
    .filter((c) => c.active && c.championship)
    .sort((a, b) => a.position - b.position)

  // No championships enrolled.
  if (active.length === 0) {
    return (
      <div className="league-comparison">
        <p className="league-comparison-empty">No championships enrolled yet.</p>
      </div>
    )
  }

  // Single championship — just show a card.
  if (active.length === 1) {
    const member = active[0]
    return (
      <div className="league-comparison">
        <h3 className="league-comparison-title">Championship</h3>
        <div
          className="comparison-card comparison-card--leader"
          onClick={() => onChampClick?.(member.championship!._id)}
        >
          <div className="comparison-card-left">
            <ImageIcon src={member.championship?.icon || ""} size="small" />
            <span className="comparison-card-name">{member.championship?.name}</span>
          </div>
          <div className="comparison-card-right">
            <span className="comparison-card-avg">{effectiveAvg(member).toFixed(1)}%</span>
            {member.missedRounds > 0 && <span className="comparison-card-penalty">-{member.missedRounds * 5}%</span>}
            <span className="comparison-card-rounds">R{member.roundsCompleted}</span>
          </div>
        </div>
      </div>
    )
  }

  // Exactly 2 championships — VS head-to-head layout.
  if (active.length === 2) {
    const left = active[0]
    const right = active[1]
    const leftEffective = effectiveAvg(left)
    const rightEffective = effectiveAvg(right)
    const leftIsLeader = leftEffective >= rightEffective

    return (
      <div className="league-comparison">
        <h3 className="league-comparison-title">Head to Head</h3>
        <div className="versus-container">
          {/* Left championship. */}
          <div
            className={`versus-side${leftIsLeader ? " versus-side--leader" : ""}`}
            onClick={() => onChampClick?.(left.championship!._id)}
          >
            <ImageIcon src={left.championship?.icon || ""} size="medium" />
            <span className="versus-name">{left.championship?.name}</span>
            <span className="versus-avg">{leftEffective.toFixed(1)}%</span>
            {left.missedRounds > 0 && <span className="versus-penalty">-{left.missedRounds * 5}% penalty</span>}
            <div className="versus-bar-track">
              <div
                className={`versus-bar-fill${leftIsLeader ? " versus-bar-fill--leader" : ""}`}
                style={{ width: `${Math.min(leftEffective, 100)}%` }}
              />
            </div>
            <div className="versus-stats">
              <span>Score: {left.cumulativeScore}</span>
              <span>Rounds: {left.roundsCompleted}</span>
            </div>
          </div>

          {/* VS divider. */}
          <div className="versus-divider">
            <span>VS</span>
          </div>

          {/* Right championship. */}
          <div
            className={`versus-side${!leftIsLeader ? " versus-side--leader" : ""}`}
            onClick={() => onChampClick?.(right.championship!._id)}
          >
            <ImageIcon src={right.championship?.icon || ""} size="medium" />
            <span className="versus-name">{right.championship?.name}</span>
            <span className="versus-avg">{rightEffective.toFixed(1)}%</span>
            {right.missedRounds > 0 && <span className="versus-penalty">-{right.missedRounds * 5}% penalty</span>}
            <div className="versus-bar-track">
              <div
                className={`versus-bar-fill${!leftIsLeader ? " versus-bar-fill--leader" : ""}`}
                style={{ width: `${Math.min(rightEffective, 100)}%` }}
              />
            </div>
            <div className="versus-stats">
              <span>Score: {right.cumulativeScore}</span>
              <span>Rounds: {right.roundsCompleted}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3+ championships — ranked list with visual bars.
  return (
    <div className="league-comparison">
      <h3 className="league-comparison-title">Standings</h3>
      <div className="ranked-list">
        {active.map((member) => {
          const isLeader = member.position === 1
          const medalClass = member.position <= 3 ? ` ranked-pos--${member.position}` : ""
          const memberEffective = effectiveAvg(member)

          return (
            <div
              key={member.championship?._id}
              className={`ranked-row${isLeader ? " ranked-row--leader" : ""}`}
              onClick={() => onChampClick?.(member.championship!._id)}
            >
              <span className={`ranked-pos${medalClass}`}>{positionLabel(member.position)}</span>
              <div className="ranked-info">
                <div className="ranked-header">
                  <ImageIcon src={member.championship?.icon || ""} size="small" />
                  <span className="ranked-name">{member.championship?.name}</span>
                  {member.missedRounds > 0 && <span className="ranked-penalty">-{member.missedRounds * 5}%</span>}
                  <span className="ranked-rounds">R{member.roundsCompleted}</span>
                </div>
                <div className="ranked-bar-track">
                  <div
                    className={`ranked-bar-fill${isLeader ? " ranked-bar-fill--leader" : ""}`}
                    style={{ width: `${Math.min(memberEffective, 100)}%` }}
                  />
                </div>
              </div>
              <span className="ranked-avg">{memberEffective.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LeagueStandings
