import React from "react"
import './_champCompleteCard.scss'
import { SportsScore, Error } from "@mui/icons-material"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import ErrorDisplay from "../../utility/errorDisplay/ErrorDisplay"
import { createChampFormErrType } from "../../../page/CreateChamp/CreateChamp"

interface champCompleteCardType {
  backendErr?: graphQLErrorType
  formErr?: createChampFormErrType
}

const ChampCompleteCard: React.FC<champCompleteCardType> = ({ backendErr, formErr }) => {
  // Collect all non-empty formErr messages for display.
  const formErrors = formErr
    ? Object.values(formErr).filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []

  return (
    <div className="champ-complete-card">
      <div className="champ-complete-text-container">
        <div className="champ-complete-title">
          <h4>Finish</h4>
          <SportsScore/>
        </div>
        <p>As the adjudicator of this championship you can always
        edit the details of this championship after creation.</p>
      </div>
      {formErrors.length > 0 && (
        <div className="error-display-container">
          <div className="error-display-title">
            <h4>Validation Error</h4>
            <Error/>
          </div>
          {formErrors.map((err, i) => <p key={i}>{err}</p>)}
        </div>
      )}
      <ErrorDisplay backendErr={backendErr}/>
    </div>
  )
}

export default ChampCompleteCard
