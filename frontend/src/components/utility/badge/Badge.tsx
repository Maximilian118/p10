import React, { useState } from "react"
import './_badge.scss'
import { badgeType } from "../../../shared/types"
import BadgeOverlay from "./badgeOverlay/BadgeOverlay"
import { IconButton } from "@mui/material"
import { Edit } from "@mui/icons-material"

interface badgeCompType {
  badge: badgeType
  zoom: number
  onClick?: () => void
  style?: React.CSSProperties
  showEditButton?: boolean // Controls edit button visibility, defaults to true when onClick exists.
}

const Badge: React.FC<badgeCompType> = ({ badge, zoom, onClick, style, showEditButton = true }) => {
  const [ error, setError ] = useState<boolean>(false)

  // Get display URL - prefer S3 URL, fall back to preview URL for local display.
  const displayUrl = badge.url || badge.previewUrl || ""

  const iconContent = (error: boolean, src: string) => {
    if (!error) {
      return (
        <img 
          alt="badge"
          src={src} 
          onError={() => setError(true)}
          className="badge-img"
          style={{ 
            width: zoom ? `${zoom}%` : "100%",
            height: zoom ? `${zoom}%` : "100%",
          }}
        />
      )
    } else {
      return (
        <div className="image-error">
          <p>{`err`}</p>
        </div>
      )
    }
  }

  return (
    <div className="badge" style={style} onClick={onClick}>
      {onClick && showEditButton && (
        <IconButton className="edit-button">
          <Edit/>
        </IconButton>
      )}
      <BadgeOverlay rarity={badge.rarity} thickness={2}/>
      <div className="outer-ring">
        <div className="inner-ring"/>
          {iconContent(error, displayUrl)}
      </div>
    </div>
  )
}

export default Badge
