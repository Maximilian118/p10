import React, { useState, useEffect, useCallback, useMemo } from "react"
import "./_f1SessionView.scss"
import Button from "@mui/material/Button"
import Trackmap from "../../../../../../api/openAPI/components/Trackmap/Trackmap"
import { useDemoStatus } from "../../../../../../api/openAPI/useTrackmap"
import { DriverLiveState } from "../../../../../../api/openAPI/types"
import { RoundType, driverType } from "../../../../../../shared/types"
import F1DriverCard from "./F1DriverCard/F1DriverCard"
import FillLoading from "../../../../../../components/utility/fillLoading/FillLoading"

interface F1SessionViewProps {
  round?: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
  demoMode?: boolean
  sessionLabel?: string
}

// Formats milliseconds as HH:MM:SS.
const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// View displayed when betting has closed for F1 series or during demo mode.
// Shows live track map with car positions and driver cards from OpenF1 data.
const F1SessionView: React.FC<F1SessionViewProps> = ({
  round,
  isAdjudicator,
  onAdvance,
  demoMode,
  sessionLabel,
}) => {
  const [driverView, setDriverView] = useState<DriverLiveState | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [trackReady, setTrackReady] = useState(false)
  const [driverStates, setDriverStates] = useState<DriverLiveState[]>([])
  const { demoPhase, demoRemainingMs, demoStartedAt } = useDemoStatus()

  const advButton = !demoMode && isAdjudicator && onAdvance
  const demoEnded = demoMode && demoPhase === "ended"

  // Build a lookup map from driverID (3-letter acronym) to championship driver.
  const champDriverMap = useMemo(() => {
    const map = new Map<string, driverType>()
    if (!round?.drivers) return map
    round.drivers.forEach((entry) => {
      if (entry.driver?.driverID) {
        map.set(entry.driver.driverID, entry.driver)
      }
    })
    return map
  }, [round])

  // Countdown timer — updates every second while demo is running.
  const updateCountdown = useCallback(() => {
    if (demoStartedAt > 0 && demoRemainingMs > 0) {
      const elapsed = Date.now() - demoStartedAt
      setRemainingMs(Math.max(0, demoRemainingMs - elapsed))
    }
  }, [demoStartedAt, demoRemainingMs])

  // Start the countdown only after the track has loaded and the demo hasn't ended.
  useEffect(() => {
    if (!demoMode || demoRemainingMs === 0 || demoEnded || !trackReady) return

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [demoMode, demoRemainingMs, demoEnded, trackReady, updateCountdown])

  // Toggles driver view — selects a driver by number or clears the selection.
  const handleDriverViewSelect = useCallback((driverNumber: number | null) => {
    if (driverNumber === null || driverView?.driverNumber === driverNumber) {
      setDriverView(null)
    } else {
      const match = driverStates.find((d) => d.driverNumber === driverNumber)
      setDriverView(match ?? null)
    }
  }, [driverView, driverStates])

  // Handles driver selection from the track map (car dot click or SVG background click).
  const handleMapDriverSelect = useCallback((driver: { driverNumber: number } | null) => {
    handleDriverViewSelect(driver?.driverNumber ?? null)
  }, [handleDriverViewSelect])

  // Called once by the Trackmap component when track data first arrives.
  const handleTrackReady = useCallback(() => {
    setTrackReady(true)
  }, [])

  // Receives aggregated driver live states from the Trackmap.
  const handleDriverStatesUpdate = useCallback((states: DriverLiveState[]) => {
    setDriverStates(states)
  }, [])

  // Determine the title text and style based on demo state.
  const titleText = demoEnded ? "End of Demo" : (sessionLabel || (demoMode ? "F1 Demo Session" : "F1 Live Session"))
  const titleClass = `f1-session-header__title${demoEnded ? " f1-session-header__title--ended" : ""}`

  return (
    <div className="f1-session-view">
      {/* Full-page spinner while session data is loading */}
      {!trackReady && <FillLoading />}

      {/* Main content — hidden while loading but Trackmap stays mounted
          so its useTrackmap hook keeps the data pipeline active. */}
      <div className="f1-session-content" style={!trackReady ? { display: "none" } : undefined}>
        {/* Demo header with countdown, title, and badge */}
        {demoMode ? (
          <div className="f1-session-header">
            <span className="f1-session-header__countdown">
              {formatCountdown(remainingMs)}
            </span>
            <p className={titleClass}>{titleText}</p>
            <span className="f1-session-header__badge">
              <span className="demo-badge">DEMO</span>
            </span>
          </div>
        ) : !demoMode && (
          <p className="f1-session-title">F1 Live Session</p>
        )}

        {/* Live track map with car positions */}
        <div className="trackmap-container">
          <Trackmap
            selectedDriverNumber={driverView?.driverNumber ?? null}
            onDriverSelect={handleMapDriverSelect}
            onDriverStatesUpdate={handleDriverStatesUpdate}
            demoMode={demoMode}
            onTrackReady={handleTrackReady}
          />
        </div>

        {/* A list of all drivers in the session with their current stats */}
        <div className="driver-list">
          {driverStates.map((state) => {
            const champDriver = champDriverMap.get(state.nameAcronym)
            return (
              <F1DriverCard
                key={state.driverNumber}
                state={state}
                champDriver={champDriver}
                selected={driverView?.driverNumber === state.driverNumber}
                onClick={() => handleDriverViewSelect(state.driverNumber)}
              />
            )
          })}
        </div>

        {advButton && (
          <Button
            variant="contained"
            className="advance-button"
            color="primary"
            onClick={onAdvance}
          >
            Show Results
          </Button>
        )}
      </div>
    </div>
  )
}

export default F1SessionView
