import React, { SyntheticEvent } from "react"
import "./_floatingLeagueCard.scss"
import { LeagueMemberType } from "../../../shared/types"
import { positionLabel, effectiveAvg } from "../../../shared/leagueUtils"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface FloatingLeagueCardProps {
  league: { icon: string; name: string; championships: LeagueMemberType[] }
  onClick?: (e: SyntheticEvent) => void
}

// Compact league standings card displayed on the home page above the social feed.
const FloatingLeagueCard: React.FC<FloatingLeagueCardProps> = ({ league, onClick }) => {
  // Filter and sort active championships by position.
  const active = league.championships
    .filter((c) => c.active && c.championship)
    .sort((a, b) => a.position - b.position)

  if (active.length === 0) return null

  return (
    <div className="floating-league-card" onClick={onClick}>
      {/* Header: league icon and name. */}
      <div className="floating-league-card__header">
        <div className="floating-league-card__icon">
          <ImageIcon src={league.icon} size="contained" />
        </div>
        <p className="floating-league-card__title">{league.name}</p>
      </div>

      {/* Scrollable standings list. */}
      <div className="floating-league-card__standings">
        {active.map((member) => {
          const avg = effectiveAvg(member.cumulativeAverage, member.missedRounds)
          const medalClass = member.position <= 3 ? ` floating-league-card__pos--${member.position}` : ""

          return (
            <div key={member.championship!._id} className="floating-league-card__row">
              <span className={`floating-league-card__pos${medalClass}`}>
                {positionLabel(member.position)}
              </span>
              <ImageIcon src={member.championship?.icon || ""} size="small" />
              <span className="floating-league-card__name">{member.championship?.name}</span>
              <span className="floating-league-card__avg">{avg.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FloatingLeagueCard
