import React, { useState, useEffect, useRef } from "react"
import './_start-lights.scss'
import {
  defaultLights,
  hazardLights,
  redLights,
  red1Lights,
  red2Lights,
  red3Lights,
  red4Lights,
  StartLightsStatus,
  getLightStatus,
  randomiseRoundStartTime
} from "./startLightsUtility"

export type { StartLightsStatus }

interface StartLightsType {
  status?: StartLightsStatus
  startSequence?: boolean
  onSequenceComplete?: () => void
}

// Maps each status to the row configuration (which light pattern each row should display)
const rowConfigs: Record<string, string[][]> = {
  // Race start sequence - only bottom 2 rows illuminate, column by column
  off: [defaultLights, defaultLights, defaultLights, defaultLights],
  red1: [defaultLights, defaultLights, red1Lights, red1Lights],
  red2: [defaultLights, defaultLights, red2Lights, red2Lights],
  red3: [defaultLights, defaultLights, red3Lights, red3Lights],
  red4: [defaultLights, defaultLights, red4Lights, red4Lights],
  red5: [defaultLights, defaultLights, redLights, redLights],
  go: [defaultLights, defaultLights, defaultLights, defaultLights],
  // Legacy states
  red: [redLights, redLights, redLights, redLights],
  hazard: [hazardLights, hazardLights, defaultLights, defaultLights],
  default: [defaultLights, defaultLights, defaultLights, defaultLights],
}

const StartLights: React.FC<StartLightsType> = ({ status = "off", startSequence = false, onSequenceComplete }) => {
  const [sequenceStatus, setSequenceStatus] = useState<StartLightsStatus>("off")
  const [sequenceSeconds, setSequenceSeconds] = useState(6)
  const sequenceTriggered = useRef(false)
  const sequenceCompleted = useRef(false)

  // Handle start sequence timing
  useEffect(() => {
    if (!startSequence || sequenceTriggered.current) return
    sequenceTriggered.current = true

    // Start the 5-second countdown
    const timer = setInterval(() => {
      setSequenceSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [startSequence])

  // Update light status based on sequence countdown
  useEffect(() => {
    if (!startSequence) return

    const newStatus = getLightStatus(sequenceSeconds)
    setSequenceStatus(newStatus)

    // At red5 (1 second remaining), trigger the random delay then complete
    if (sequenceSeconds === 1 && !sequenceCompleted.current) {
      sequenceCompleted.current = true
      const delay = randomiseRoundStartTime()

      setTimeout(() => {
        setSequenceStatus("go")
        if (onSequenceComplete) {
          onSequenceComplete()
        }
      }, delay * 1000)
    }
  }, [sequenceSeconds, startSequence, onSequenceComplete])

  // Use sequence status when in sequence mode, otherwise use prop status
  const currentStatus = startSequence ? sequenceStatus : status

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
  const config = rowConfigs[currentStatus] || rowConfigs.default

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
