import React from "react"
import "./_leagueBanner.scss"
import { LeagueType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"

interface leagueBannerType {
  league: LeagueType
}

// Banner displaying league icon, name, series, lock status, and member count.
const LeagueBanner: React.FC<leagueBannerType> = ({ league }) => {
  const activeCount = league.championships.filter((c) => c.active).length

  return (
    <div className="league-banner">
      <div className="league-banner-icon">
        <ImageIcon src={league.profile_picture || league.icon} size="large" />
      </div>
      <h2 className="league-banner-name">{league.name}</h2>
      <div className="league-banner-meta">
        <span className="league-banner-series">{league.series?.name}</span>
        <span className="league-banner-divider">|</span>
        <span className="league-banner-count">
          {activeCount}/{league.settings.maxChampionships} Championships
        </span>
      </div>
      <div className="league-banner-lock">
        {league.locked ? (
          <>
            <LockIcon fontSize="small" />
            <span>Locked</span>
          </>
        ) : (
          <>
            <LockOpenIcon fontSize="small" />
            <span>Locks at round {league.lockThreshold}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default LeagueBanner
