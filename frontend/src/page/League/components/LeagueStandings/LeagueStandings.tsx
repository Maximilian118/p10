import React from "react"
import "./_leagueStandings.scss"
import { LeagueMemberType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"

interface leagueStandingsType {
  championships: LeagueMemberType[]
  onChampClick?: (champId: string) => void
}

// Ranked standings table of championships in the league.
const LeagueStandings: React.FC<leagueStandingsType> = ({ championships, onChampClick }) => {
  // Sort active championships by position.
  const active = championships
    .filter((c) => c.active && c.championship)
    .sort((a, b) => a.position - b.position)

  if (active.length === 0) {
    return (
      <div className="league-standings">
        <p className="league-standings-empty">No championships enrolled yet.</p>
      </div>
    )
  }

  return (
    <div className="league-standings">
      <h3 className="league-standings-title">Standings</h3>
      <div className="league-standings-header">
        <span className="standings-pos">#</span>
        <span className="standings-name">Championship</span>
        <span className="standings-avg">Avg %</span>
        <span className="standings-rounds">Rounds</span>
      </div>
      {active.map((member) => (
        <div
          key={member.championship?._id}
          className="league-standings-row"
          onClick={() => onChampClick?.(member.championship!._id)}
        >
          <span className="standings-pos">{member.position}</span>
          <div className="standings-champ">
            <ImageIcon src={member.championship?.icon || ""} size="small" />
            <span className="standings-name">{member.championship?.name}</span>
          </div>
          <span className="standings-avg">{member.cumulativeAverage.toFixed(1)}%</span>
          <span className="standings-rounds">{member.roundsCompleted}</span>
        </div>
      ))}
    </div>
  )
}

export default LeagueStandings
