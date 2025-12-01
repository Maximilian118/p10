import React from "react"
import './_champCompleteCard.scss'
import { Error, SportsScore } from "@mui/icons-material"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"

interface champCompleteCardType {
  stepperBtns?: JSX.Element
  style?: React.CSSProperties
  backendErr?: graphQLErrorType
}

const ChampCompleteCard: React.FC<champCompleteCardType> = ({ stepperBtns, style, backendErr }) => {
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
      {backendErr?.message && (
        <div className="champ-complete-error-container">
          <div className="champ-complete-error-title">
            <h4>Error</h4>
            <Error/>
          </div>
          <p>{backendErr.message}</p>
        </div>
      )}
      {stepperBtns}
    </div>
  )
}

export default ChampCompleteCard
