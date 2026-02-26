import React, { SyntheticEvent } from "react"
import "./_leagueCard.scss"
import { LeagueType } from "../../../shared/types"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import SportsScoreIcon from "@mui/icons-material/SportsScore"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import { EmojiEvents } from "@mui/icons-material"

interface leagueCardType {
  league: LeagueType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card for displaying a league in a list with series chip, stats, and championship icons.
const LeagueCard: React.FC<leagueCardType> = ({ league, onClick, highlight }) => {
  // API series: show R{completedRounds}/{rounds}. Non-API series: show the season year.
  const isAPISeries = league.series?.hasAPI && league.series?.rounds

  return (
    <div className={`league-card${highlight ? " league-card__highlight" : ""}`} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={league.icon} size="contained" />
      </div>
      <div className="league-card-content">
        <p className="league-card-title">{league.name}</p>

        {/* Series chip with icon for quick series identification. */}
        {league.series && (
          <div className="league-card-series-chip">
            <ImageIcon src={league.series.icon} size="small" />
            <span>{league.series.name}</span>
          </div>
        )}

        {/* Stats row with lock status, member count, and round/season progress. */}
        <div className="league-card-stats">
          <div className={`league-card-chip ${league.locked ? "league-card-chip--locked" : league.settings.inviteOnly ? "league-card-chip--invite-only" : "league-card-chip--open"}`}>
            {league.locked ? <LockIcon /> : league.settings.inviteOnly ? <LockIcon /> : <LockOpenIcon />}
            <span>{league.locked ? "Locked" : league.settings.inviteOnly ? "Invite Only" : "Open"}</span>
          </div>
          <div className="league-card-chip league-card-chip--neutral">
            <EmojiEvents />
            <span>{league.championships.filter((m) => m.active).length}/{league.settings.maxChampionships}</span>
          </div>
          {/* API series: round progress chip. Non-API series: season year chip. */}
          {isAPISeries ? (
            <div className="league-card-chip league-card-chip--neutral">
              <SportsScoreIcon />
              <span>R{league.series?.completedRounds ?? 0}/{league.series?.rounds}</span>
            </div>
          ) : (
            <div className="league-card-chip league-card-chip--neutral">
              <CalendarTodayIcon />
              <span>{league.season}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LeagueCard
