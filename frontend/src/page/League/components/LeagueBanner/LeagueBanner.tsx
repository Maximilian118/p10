import React from "react"
import "./_leagueBanner.scss"
import { LeagueType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import SportsScoreIcon from "@mui/icons-material/SportsScore"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import { EmojiEvents } from "@mui/icons-material"

interface leagueBannerType {
  league: LeagueType
}

// Hero banner with profile_picture background, league icon, name, series chip, and status chips.
const LeagueBanner: React.FC<leagueBannerType> = ({ league }) => {
  const activeCount = league.championships.filter((c) => c.active).length

  // API series: show R{completedRounds}/{rounds}. Non-API series: show the season year.
  const isAPISeries = league.series?.hasAPI && league.series?.rounds

  return (
    <div className="league-hero">
      {/* Background image with gradient overlay. */}
      <div
        className="league-hero-bg"
        style={{ backgroundImage: `url(${league.profile_picture || league.icon})` }}
      />
      <div className="league-hero-overlay" />

      {/* League icon. */}
      <div className="league-hero-icon">
        <ImageIcon src={league.icon} size="xx-large" />
      </div>

      {/* League name. */}
      <h1 className="league-hero-name">{league.name}</h1>

      {/* Series chip. */}
      {league.series && (
        <div className="league-hero-series">
          <ImageIcon src={league.series.icon} size="small" />
          <span>{league.series.name}</span>
        </div>
      )}

      {/* Status chips row. */}
      <div className="league-hero-chips">
        <div className={`hero-chip ${league.locked ? "hero-chip--locked" : league.settings.inviteOnly ? "hero-chip--invite-only" : "hero-chip--open"}`}>
          {league.locked ? <LockIcon /> : league.settings.inviteOnly ? <LockIcon /> : <LockOpenIcon />}
          <span>{league.locked ? "Locked" : league.settings.inviteOnly ? "Invite Only" : "Open"}</span>
        </div>
        <div className="hero-chip hero-chip--neutral">
          <EmojiEvents />
          <span>{activeCount}/{league.settings.maxChampionships}</span>
        </div>
        {/* API series: round progress chip. Non-API series: season year chip. */}
        {isAPISeries ? (
          <div className="hero-chip hero-chip--neutral">
            <SportsScoreIcon />
            <span>R{league.series?.completedRounds ?? 0}/{league.series?.rounds}</span>
          </div>
        ) : (
          <div className="hero-chip hero-chip--neutral">
            <CalendarTodayIcon />
            <span>{league.season}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeagueBanner
