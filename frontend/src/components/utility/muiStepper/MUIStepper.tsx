import React from "react"
import './_muiStepper.scss'
import { Step, StepLabel, Stepper } from "@mui/material"

interface muiStepperType {
  steps: { label: string, description: string }[]
  activeStep: number
  style?: React.CSSProperties
}

const MUIStepper: React.FC<muiStepperType> = ({ steps, activeStep, style }) => (
  <div className="mui-stepper" style={style}>
    <Stepper activeStep={activeStep}>
      {steps.map((step, i) => {
        const stepProps: { completed?: boolean } = {}
        return (
          <Step key={i} {...stepProps}>
            <StepLabel>{activeStep === i && step.label}</StepLabel>
          </Step>
        )
      })}
    </Stepper>
  </div>
)

export default MUIStepper
