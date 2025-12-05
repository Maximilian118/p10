import React from "react"
import './_champHeaderCard.scss'
import MUIStepper from "../../utility/muiStepper/MUIStepper"
import { muiStepperSteps } from "../../utility/muiStepper/muiStepperUtility"

interface champHeaderCardType {
  activeStep: number
}

const ChampHeaderCard: React.FC<champHeaderCardType> = ({ activeStep }) => (
  <div className="champ-header-card">
    <div className="form-title">
      <h2 style={{ marginBottom: 10 }}>Create Championship</h2>
    </div>
    <div className="champ-header-stepper">
      <MUIStepper steps={muiStepperSteps.createChamp} activeStep={activeStep}/>
    </div>
  </div>
)

export default ChampHeaderCard
