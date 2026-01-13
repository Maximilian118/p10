import React, { SyntheticEvent } from "react"
import './_floatingChampCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface floatingChampCardType {
  champ: { icon: string; name: string }
  onClick?: (e: SyntheticEvent) => void
}

// Displays a floating championship card at the top of the home page.
const FloatingChampCard: React.FC<floatingChampCardType> = ({ champ, onClick }) => {
  return (
    <div className="floating-champ-card" onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={champ.icon} size="contained"/>
      </div>
      <div className="champ-content">
        <p className="champ-title">{champ.name}</p>
      </div>
    </div>
  )
}

export default FloatingChampCard
