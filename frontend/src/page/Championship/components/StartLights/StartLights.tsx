import React from "react"
import './_start-lights.scss'
import { defaultLights, hazardLights, redLights } from "./startLightsUtility"

export type StartLightsStatus = "red" | "yellow" | "green" | "default" | "hazard"

interface StartLightsType {
  status: StartLightsStatus
}

// Maps each status to the row configuration (which light pattern each row should display)
const rowConfigs: Record<string, string[][]> = {
  red: [redLights, redLights, redLights, redLights],
  hazard: [hazardLights, hazardLights, defaultLights, defaultLights],
  default: [defaultLights, defaultLights, defaultLights, defaultLights],
}

const StartLights: React.FC<StartLightsType> = ({ status }) => {
  // Each actual circle light, using CSS custom property for color
  const lightCircle = (colour: string, i: number) => (
    <div
      key={i}
      className="start-light-circle"
      style={{ '--light-color': colour } as React.CSSProperties}
    />
  )

  // Each row of 5 lights
  const lightRow = (colours: string[], rowIndex: number) => (
    <div key={rowIndex} className="start-light-row">
      {colours.map((colour, i) => lightCircle(colour, i))}
    </div>
  )

  // Get the row config for the current status, fallback to default
  const config = rowConfigs[status] || rowConfigs.default

  return (
    <div className="start-lights-container">
      <div className="start-lights">
        {config.map((rowColours, index) => lightRow(rowColours, index))}
      </div>
      <img alt="Start Lights" src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/start_lights.png"/>
    </div>
  )
}

export default StartLights
