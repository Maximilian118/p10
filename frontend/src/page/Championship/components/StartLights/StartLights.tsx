import React from "react"
import './_start-lights.scss'
import { defaultLights, hazardLights, redLights } from "./startLightsUtility"

export type StartLightsStatus = "red" | "yellow" | "green" | "default" | "hazard"

interface StartLightsType {
  status: StartLightsStatus
}

const StartLights: React.FC<StartLightsType> = ({ status }) => {
  // Each actual circle light
  const lightCircle = (colour: string, i: number) => <div key={i} className="start-light-circle" style={{ background: colour }}/>

  // Each row of 5 lights
  const lightRow = (row: StartLightsStatus) => {
    let lRow = defaultLights.map((colour, i) => lightCircle(colour, i))

    switch (row) {
      case "red": lRow = redLights.map((colour, i) => lightCircle(colour, i))
        break;
      case "hazard": lRow = hazardLights.map((colour, i) => lightCircle(colour, i))
        break;
      default: lRow = defaultLights.map((colour, i) => lightCircle(colour, i))
        break;
    }

    return (
      <div className="start-light-row">
        {lRow}
      </div>
    )
  }

  // A switch that detemines the exact order of lights for each row based on StartLightsStatus
  const statusSwitch = (status: StartLightsStatus) => {
    if (status === "red") {
      return (
        <>
          {lightRow("red")}
          {lightRow("red")}
          {lightRow("red")}
          {lightRow("red")}
        </>
      )
    }

    if (status === "hazard") {
      return (
        <>
          {lightRow("hazard")}
          {lightRow("hazard")}
          {lightRow("default")}
          {lightRow("default")}
        </>
      )
    }

    return (
      <>
        {lightRow("default")}
        {lightRow("default")}
        {lightRow("default")}
        {lightRow("default")}
      </>
    )
  }

  return (
    <div className="start-lights-container">
      <div className="start-lights">
        {statusSwitch(status)}
      </div>
      <img alt="Start Lights" src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/start_lights.png"/>
    </div>
  )
}

export default StartLights
