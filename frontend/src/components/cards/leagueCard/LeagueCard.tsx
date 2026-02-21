import React, { SyntheticEvent } from "react"
import "./_leagueCard.scss"
import { LeagueType } from "../../../shared/types"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import LockIcon from "@mui/icons-material/Lock"

interface leagueCardType {
  league: LeagueType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card for displaying a league in a list with championship icons underneath.
const LeagueCard: React.FC<leagueCardType> = ({ league, onClick, highlight }) => {
  // Only show active championships in the icon list.
  const activeChampionships = league.championships
    .filter((m) => m.active && m.championship)
    .map((m) => m.championship!)

  return (
    <div className={`league-card${highlight ? " league-card__highlight" : ""}`} onClick={onClick}>
      {league.locked && (
        <div className="league-card-lock">
          <LockIcon fontSize="small" />
        </div>
      )}
      <div className="main-icon-container">
        <ImageIcon src={league.icon} size="contained" />
      </div>
      <div className="league-card-content">
        <p className="league-card-title">{league.name}</p>
        <div className="league-card-meta">
          <span className="league-card-series">{league.series?.shortName || league.series?.name}</span>
          <span className="league-card-count">
            {activeChampionships.length}/{league.settings.maxChampionships}
          </span>
        </div>
        {activeChampionships.length > 0 && (
          <IconList items={activeChampionships} />
        )}
      </div>
    </div>
  )
}

export default LeagueCard
