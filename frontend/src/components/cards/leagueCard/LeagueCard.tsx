import React, { SyntheticEvent } from "react"
import "./_leagueCard.scss"
import { LeagueType } from "../../../shared/types"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import SportsScoreIcon from "@mui/icons-material/SportsScore"
import { EmojiEvents } from "@mui/icons-material"

interface leagueCardType {
  league: LeagueType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card for displaying a league in a list with series chip, stats, and championship icons.
const LeagueCard: React.FC<leagueCardType> = ({ league, onClick, highlight }) => {
  // Only show active championships in the icon list.
  const activeChampionships = league.championships
    .filter((m) => m.active && m.championship)
    .map((m) => m.championship!)

  // Find the highest rounds completed across all active members.
  const maxRoundsCompleted = league.championships
    .filter((m) => m.active)
    .reduce((max, m) => Math.max(max, m.roundsCompleted || 0), 0)

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

        {/* Stats row with lock status, member count, and rounds. */}
        <div className="league-card-stats">
          <div className={`league-card-chip ${league.locked ? "league-card-chip--locked" : "league-card-chip--open"}`}>
            {league.locked ? <LockIcon /> : <LockOpenIcon />}
            <span>{league.locked ? "Locked" : "Open"}</span>
          </div>
          <div className="league-card-chip league-card-chip--neutral">
            <EmojiEvents/>
            <span>{activeChampionships.length}/{league.settings.maxChampionships}</span>
          </div>
          {league.series?.rounds && (
            <div className="league-card-chip league-card-chip--neutral">
              <SportsScoreIcon />
              <span>R{maxRoundsCompleted}/{league.series.rounds}</span>
            </div>
          )}
        </div>

        {/* Championship icon list. */}
        {activeChampionships.length > 0 && (
          <IconList items={activeChampionships} />
        )}
      </div>
    </div>
  )
}

export default LeagueCard
