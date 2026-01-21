import React from "react"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../icon/imageIcon/ImageIcon"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import './_champSection.scss'
import ChampQuickStats from "../champQuickStats/ChampQuickStats"
import ChampBannerStats from "../../../../page/Championship/components/ChampBannerStats/ChampBannerStats"
import { buildChampBannerStats } from "../../../../page/Championship/champUtility"

interface ChampSectionProps {
  user: userType
  champ: ChampType
}

const ChampSection: React.FC<ChampSectionProps> = ({ user, champ }) => {
  const navigate = useNavigate()

  // Navigates to the championship details page
  const handleChampClick = () => {
    navigate(`/championship/${champ._id}`)
  }

  return (
    <div className="champ-section">
      <div className="champ-section-header" onClick={handleChampClick}>
        <ImageIcon src={champ.icon} size="large"/>
        <ChampQuickStats champ={champ} userId={user._id}/>
        <div className="champ-section-info">
          <h5 className="champ-name">{champ.name}</h5>
          <ChampBannerStats stats={buildChampBannerStats(champ, undefined, { showDrivers: false })}/>
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
