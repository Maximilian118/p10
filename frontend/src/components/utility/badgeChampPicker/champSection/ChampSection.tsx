import React from "react"
import ImageIcon from "../../icon/imageIcon/ImageIcon"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import './_champSection.scss'
import ChampQuickStats from "../champQuickStats/ChampQuickStats"

interface ChampSectionProps {
  user: userType
  champ: ChampType
}

const ChampSection: React.FC<ChampSectionProps> = ({ user, champ }) => {
  return (
    <div className="champ-section">
      <div className="champ-section-header">
        <ImageIcon src={champ.icon} size="large"/>
        <ChampQuickStats champ={champ} userId={user._id}/>
        <div className="champ-section-info">
          <h5>{champ.name}</h5>
        </div>
      </div>
      {/* <div className="champ-badges-grid">
        {earnedBadges.map(badge => (
          <Badge key={badge._id} badge={badge} zoom={badge.zoom}/>
        ))}
      </div> */}
    </div>
  )
}

export default ChampSection
