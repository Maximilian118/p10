import React from "react"
import './_champCompleteCard.scss'
import { SportsScore } from "@mui/icons-material"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import ErrorDisplay from "../../utility/errorDisplay/ErrorDisplay"

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
      <ErrorDisplay backendErr={backendErr}/>
      {stepperBtns}
    </div>
  )
}

export default ChampCompleteCard
