import React, { useState } from "react"
import './_createChampHeader.scss'
import MUIStepper from "../../utility/muiStepper/MUIStepper"
import { muiStepperSteps } from "../../utility/muiStepper/muiStepperUtility"
import { Info } from "@mui/icons-material"
import InfoModal from "../../modal/configs/InfoModal/InfoModal"
import { tooltips } from "../../../shared/tooltip"

interface createChampHeaderType {
  activeStep: number
}

const CreateChampHeader: React.FC<createChampHeaderType> = ({ activeStep }) => {
  const [showInfo, setShowInfo] = useState<boolean>(false)

  return (
    <div className="create-champ-header">
      <div className="create-champ-title">
        <h4>Create Championship</h4>
        <Info className="info-icon" onClick={() => setShowInfo(true)} />
      </div>
      <div className="create-champ-header-stepper">
        <MUIStepper steps={muiStepperSteps.createChamp} activeStep={activeStep}/>
      </div>

      {showInfo && (
        <InfoModal
          title={tooltips.championship.title}
          description={[...tooltips.championship.description]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}

export default CreateChampHeader
