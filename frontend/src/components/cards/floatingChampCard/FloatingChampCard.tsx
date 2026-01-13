import React, { SyntheticEvent } from "react"
import './_floatingChampCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import ChampBannerStats from "../../../page/Championship/components/ChampBannerStats/ChampBannerStats"
import RotateRightIcon from "@mui/icons-material/RotateRight"

interface floatingChampCardType {
  champ: { icon: string; name: string; currentRound: number; totalRounds: number }
  onClick?: (e: SyntheticEvent) => void
}

// Displays a floating championship card at the top of the home page.
const FloatingChampCard: React.FC<floatingChampCardType> = ({ champ, onClick }) => {
  const roundStats = [
    { icon: <RotateRightIcon />, value: `${champ.currentRound}/${champ.totalRounds}` }
  ]

  return (
    <div className="floating-champ-card" onClick={onClick}>
      <div className="floating-champ-left">
        <div className="main-icon-container">
          <ImageIcon src={champ.icon} size="contained"/>
        </div>
        <div className="champ-content">
          <p className="champ-title">{champ.name}</p>
        </div>
      </div>
      <ChampBannerStats stats={roundStats} />
    </div>
  )
}

export default FloatingChampCard
