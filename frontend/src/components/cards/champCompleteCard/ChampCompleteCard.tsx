import React from "react"
import './_champCompleteCard.scss'
import { SportsScore } from "@mui/icons-material"

interface chamoCompleteCardType{
  stepperBtns?: JSX.Element
  style?: React.CSSProperties
}

const ChampCompleteCard: React.FC<chamoCompleteCardType> = ({ stepperBtns, style }) => {
  return (
    <div className="champ-complete-card" style={style}>
      <div className="champ-complete-text-container">
        <div className="champ-complete-title">
          <h4>Finish</h4>
          <SportsScore/>
        </div>
        <p>As the adjudicator of this championship you can always 
        edit the details of this championship after creation.</p>
      </div>
      {stepperBtns}
    </div>
  )
}

export default ChampCompleteCard
