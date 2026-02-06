import React, { useState } from "react"
import "./_f1SessionView.scss"
import { RoundType } from "../../../../../../shared/types"
import Button from "@mui/material/Button"
import Trackmap from "../../../../../../api/openAPI/components/Trackmap/Trackmap"

interface SelectedDriver {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

interface F1SessionViewProps {
  round?: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
  demoMode?: boolean
}

// View displayed when betting has closed for F1 series or during demo mode.
// Shows live track map with car positions from OpenF1 data.
const F1SessionView: React.FC<F1SessionViewProps> = ({
  isAdjudicator,
  onAdvance,
  demoMode,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<SelectedDriver | null>(null)

  const advButton = !demoMode && isAdjudicator && onAdvance

  // Handles driver selection from the track map.
  const handleDriverSelect = (driver: SelectedDriver | null) => {
    setSelectedDriver(driver)
  }

  return (
    <div className="f1-session-view">
      {demoMode && <span className="demo-badge">DEMO</span>}
      <p className="f1-session-title">{demoMode ? "F1 Demo Session" : "F1 Live Session"}</p>

      {/* Live track map with car positions */}
      <div className="trackmap-container">
        <Trackmap onDriverSelect={handleDriverSelect} />
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
