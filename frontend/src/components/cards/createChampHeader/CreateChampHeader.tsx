import React, { useState } from "react"
import './_createChampHeader.scss'
import MUIStepper from "../../utility/muiStepper/MUIStepper"
import { muiStepperSteps } from "../../utility/muiStepper/muiStepperUtility"
import { Info } from "@mui/icons-material"
import InfoModal from "../../modal/configs/InfoModal/InfoModal"

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
          title="What is a Championship?"
          description={[
            "A championship is a season-long prediction competition. Competitors bet on which driver will finish in P10 each round.",
            "Points are awarded based on how close the bet is to the actual P10 finisher. The championship tracks standings, awards badges for achievements, and can be enrolled in a league to compete against other championships.",
          ]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}

export default CreateChampHeader
