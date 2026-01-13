import React from "react"
import './_champBannerStats.scss'

// Represents a single stat item with an optional icon, value, and color.
interface StatItem {
  icon?: React.ReactNode
  value: string | number
  color?: string
}

interface ChampBannerStatsProps {
  stats: StatItem[]
}

// Renders a row of stats, each with an optional icon and value.
const ChampBannerStats = ({ stats }: ChampBannerStatsProps) => {
  if (stats.length === 0) return null

  return (
    <div className="champ-banner-stats">
      {stats.map((stat, index) => (
        <div key={index} className="champ-stat" style={stat.color ? { color: stat.color } : undefined}>
          {stat.icon}
          <span>{stat.value}</span>
        </div>
      ))}
    </div>
  )
}

export default ChampBannerStats
