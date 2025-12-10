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
}

const Badge: React.FC<badgeCompType> = ({ badge, zoom, onClick, style }) => {
  const [ error, setError ] = useState<boolean>(false)

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
      {onClick && (
        <IconButton className="edit-button">
          <Edit/>
        </IconButton>
      )}
      <BadgeOverlay rarity={badge.rarity} thickness={3}/>
      <div className="outer-ring">
        <div className="inner-ring"/>
          {iconContent(error, badge.url)}
      </div>
    </div>
  )
}

export default Badge
