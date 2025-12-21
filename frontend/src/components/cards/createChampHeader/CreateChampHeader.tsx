import React from "react"
import './_createChampHeader.scss'
import MUIStepper from "../../utility/muiStepper/MUIStepper"
import { muiStepperSteps } from "../../utility/muiStepper/muiStepperUtility"

interface createChampHeaderType {
  activeStep: number
}

const CreateChampHeader: React.FC<createChampHeaderType> = ({ activeStep }) => (
  <div className="create-champ-header">
    <div className="form-title">
      <h2 style={{ marginBottom: 10 }}>Create Championship</h2>
    </div>
    <div className="create-champ-header-stepper">
      <MUIStepper steps={muiStepperSteps.createChamp} activeStep={activeStep}/>
    </div>
  </div>
)

export default CreateChampHeader
