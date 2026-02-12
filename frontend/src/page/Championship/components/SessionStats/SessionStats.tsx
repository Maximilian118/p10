import React from "react"
import "./_sessionStats.scss"
import Flag from "@mui/icons-material/Flag"
import AccessTime from "@mui/icons-material/AccessTime"
import SessionCountdown from "./SessionCountdown/SessionCountdown"

interface SessionStatsProps {
  flag: string | null
  remainingMs: number
}

// Returns the icon and CSS modifier class based on the current flag state.
const getFlagDisplay = (flag: string | null): { icon: React.ReactNode; modifier: string } => {
  switch (flag) {
    case "RED":
      return { icon: <Flag />, modifier: "red" }
    case "YELLOW":
    case "DOUBLE YELLOW":
      return { icon: <Flag />, modifier: "yellow" }
    case "GREEN":
      return { icon: <Flag />, modifier: "green" }
    default:
      return { icon: <AccessTime />, modifier: "blue" }
  }
}

// Displays session status (flag icon + countdown) in the championship banner.
// Series-agnostic — receives flag status and remaining time as props.
const SessionStats: React.FC<SessionStatsProps> = ({ flag, remainingMs }) => {
  const { icon, modifier } = getFlagDisplay(flag)

  return (
    <div className={`session-stats session-stats--${modifier}`}>
      <div className="session-stats__status">
        {icon}
        <SessionCountdown remainingMs={remainingMs} />
      </div>
    </div>
  )
}

export default SessionStats
