import React, { useState, useEffect, useCallback } from "react"
import "./_f1SessionView.scss"
import Button from "@mui/material/Button"
import Trackmap from "../../../../../../api/openAPI/components/Trackmap/Trackmap"
import { useDemoStatus } from "../../../../../../api/openAPI/useTrackmap"

interface SelectedDriver {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

interface F1SessionViewProps {
  round?: unknown
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
// Shows live track map with car positions from OpenF1 data.
const F1SessionView: React.FC<F1SessionViewProps> = ({
  isAdjudicator,
  onAdvance,
  demoMode,
  sessionLabel,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<SelectedDriver | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [trackReady, setTrackReady] = useState(false)
  const { demoPhase, demoRemainingMs, demoStartedAt } = useDemoStatus()

  const advButton = !demoMode && isAdjudicator && onAdvance
  const demoEnded = demoMode && demoPhase === "ended"

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

  // Handles driver selection from the track map.
  const handleDriverSelect = (driver: SelectedDriver | null) => {
    setSelectedDriver(driver)
  }

  // Called once by the Trackmap component when track data first arrives.
  const handleTrackReady = useCallback(() => {
    setTrackReady(true)
  }, [])

  // Determine the title text and style based on demo state.
  const titleText = demoEnded ? "End of Demo" : (sessionLabel || (demoMode ? "F1 Demo Session" : "F1 Live Session"))
  const titleClass = `f1-session-header__title${demoEnded ? " f1-session-header__title--ended" : ""}`

  return (
    <div className="f1-session-view">
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
          onDriverSelect={handleDriverSelect}
          demoMode={demoMode}
          onTrackReady={handleTrackReady}
        />
      </div>

      {/* Selected driver info */}
      {selectedDriver && (
        <div className="selected-driver">
          <span
            className="driver-colour"
            style={{ backgroundColor: `#${selectedDriver.teamColour}` }}
          />
          <span className="driver-name">{selectedDriver.fullName}</span>
          <span className="driver-team">{selectedDriver.teamName}</span>
        </div>
      )}

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
  )
}

export default F1SessionView
