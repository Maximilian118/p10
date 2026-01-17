import { SvgIconComponent } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import React from "react"
import './_badgeIcon.scss'

interface BadgeIconType {
  svg: SvgIconComponent
  className?: string
  onClick?: () => void
  count?: number
}

// Returns font size based on digit count
const getFontSize = (count: number): number => {
  if (count > 99) return 8
  if (count > 9) return 10
  return 12
}

const BadgeIcon: React.FC<BadgeIconType> = ({ svg: Svg, onClick, className, count }) => {
  const displayCount = count ? Math.min(count, 999) : undefined

  return (
    <IconButton
      className={`badge-icon ${className}`}
      onClick={onClick}
    >
      <Svg/>
      {!!displayCount && (
        <div className="badge-icon-counter">
          <p style={{ fontSize: getFontSize(displayCount) }}>{displayCount}</p>
        </div>
      )}
    </IconButton>
  )
}

export default BadgeIcon
