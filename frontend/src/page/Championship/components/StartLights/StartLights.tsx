import React, { useState, useEffect, useRef } from "react"
import './_start-lights.scss'
import {
  defaultLights,
  redLights,
  greenLights,
  orangeLights,
  red1Lights,
  red2Lights,
  red3Lights,
  red4Lights,
  StartLightsStatus,
  getLightStatus
} from "./startLightsUtility"

export type { StartLightsStatus }

interface StartLightsType {
  status?: StartLightsStatus
  startSequence?: boolean
  initialSeconds?: number // For mid-countdown sync - determines initial light status.
}

// Maps each status to the row configuration (which light pattern each row should display)
const rowConfigs: Record<StartLightsStatus, string[][]> = {
  off: [defaultLights, defaultLights, defaultLights, defaultLights],
  red1: [defaultLights, defaultLights, red1Lights, red1Lights],
  red2: [defaultLights, defaultLights, red2Lights, red2Lights],
  red3: [defaultLights, defaultLights, red3Lights, red3Lights],
  red4: [defaultLights, defaultLights, red4Lights, red4Lights],
  red5: [defaultLights, defaultLights, redLights, redLights],
  green: [defaultLights, greenLights, defaultLights, defaultLights],
  orange: [orangeLights, defaultLights, defaultLights, defaultLights],
  orange_flash: [orangeLights, defaultLights, defaultLights, defaultLights],
}

const StartLights: React.FC<StartLightsType> = ({ status = "off", startSequence = false, initialSeconds }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Handles the image onLoad event to synchronize rendering of lights and image
  const handleImageLoad = () => setImageLoaded(true)
  // Calculate initial state based on whether we're joining mid-sequence.
  // If startSequence is true and initialSeconds is within the 5s window, start at that position.
  // If countdown expired (0s), clamp to 1 so we show red5 instead of off.
  const getInitialSequenceSeconds = (): number => {
    if (startSequence && initialSeconds !== undefined && initialSeconds <= 5) {
      return Math.max(1, initialSeconds) // Clamp to 1 minimum (shows red5 when expired)
    }
    return 6 // Default: before the sequence starts (6 -> 5 triggers red1)
  }

  const [sequenceStatus, setSequenceStatus] = useState<StartLightsStatus>(() =>
    startSequence && initialSeconds !== undefined && initialSeconds <= 5
      ? getLightStatus(Math.max(1, initialSeconds)) // Clamp to 1 for expired countdown
      : "off"
  )
  const [sequenceSeconds, setSequenceSeconds] = useState(getInitialSequenceSeconds)
  const [flashOn, setFlashOn] = useState(true)
  const sequenceTriggered = useRef(startSequence && initialSeconds !== undefined && initialSeconds <= 5)

  // Handle orange flash toggling every 0.5s
  useEffect(() => {
    if (status !== "orange_flash") {
      setFlashOn(true)
      return
    }

    const flashTimer = setInterval(() => {
      setFlashOn(prev => !prev)
    }, 500)

    return () => clearInterval(flashTimer)
  }, [status])

  // Handle start sequence timing
  useEffect(() => {
    if (!startSequence || sequenceTriggered.current) return
    sequenceTriggered.current = true

    // Start the 5-second countdown
    const timer = setInterval(() => {
      setSequenceSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 1
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
  }, [sequenceSeconds, startSequence])

  // Use sequence status when in sequence mode, otherwise use prop status
  // For orange_flash, toggle between orange_flash and off based on flashOn state
  const getEffectiveStatus = (): StartLightsStatus => {
    if (startSequence) return sequenceStatus
    if (status === "orange_flash" && !flashOn) return "off"
    return status
  }
  const currentStatus = getEffectiveStatus()

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

  // Get the row config for the current status, fallback to off
  const config = rowConfigs[currentStatus] || rowConfigs.off

  return (
    <div className={`start-lights-container ${imageLoaded ? 'loaded' : ''}`}>
      <div className="start-lights">
        {config.map((rowColours, index) => lightRow(rowColours, index))}
      </div>
      <img
        alt="Start Lights"
        src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/start_lights.png"
        onLoad={handleImageLoad}
      />
    </div>
  )
}

export default StartLights
