import React from "react"
import { ThemeProvider } from "@mui/material/styles"
import { Autocomplete, TextField } from "@mui/material"
import darkTheme from "../../../../../../shared/muiDarkTheme"
import { ProtestType } from "../../../../../../shared/types"
import "./_pointsPanel.scss"

interface PointsPanelProps {
  protest: ProtestType
  filerPoints: number | null
  accusedPoints: number | null
  actionLoading: boolean
  onFilerPointsChange: (value: number | null) => void
  onAccusedPointsChange: (value: number | null) => void
  onAllocatePoints: () => void
}

// Generate point options for the autocomplete dropdown.
const generatePointOptions = (start: number, end: number): { label: string; value: number }[] => {
  const options: { label: string; value: number }[] = []
  const step = start <= end ? 1 : -1
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    const sign = i > 0 ? "+" : ""
    options.push({ label: `${sign}${i}`, value: i })
  }
  return options
}

// Points allocation panel for adjudicator after determination.
const PointsPanel: React.FC<PointsPanelProps> = ({
  protest,
  filerPoints,
  accusedPoints,
  actionLoading,
  onFilerPointsChange,
  onAccusedPointsChange,
  onAllocatePoints,
}) => {
  // Point options based on status.
  const filerPointOptions =
    protest.status === "passed" ? generatePointOptions(1, 100) : generatePointOptions(0, -100)
  const accusedPointOptions = generatePointOptions(-1, -100)

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="points-panel">
        <p className="points-panel__label">Allocate Points</p>

        {/* Filer points */}
        <div className="points-panel__field">
          <label className="points-panel__field-label">
            Points for {protest.competitor?.name}
            {protest.status === "passed" ? " (reward)" : " (penalty)"}:
          </label>
          <Autocomplete
            options={filerPointOptions}
            getOptionLabel={(option) => option.label}
            value={filerPointOptions.find((o) => o.value === filerPoints) || null}
            onChange={(_, newValue) => onFilerPointsChange(newValue?.value ?? null)}
            renderInput={(params) => (
              <TextField {...params} variant="outlined" size="small" placeholder="Select points" />
            )}
            disableClearable={false}
            className="points-panel__autocomplete"
          />
        </div>

        {/* Accused points - only if accused exists and protest passed */}
        {protest.accused && protest.status === "passed" && (
          <div className="points-panel__field">
            <label className="points-panel__field-label">Points for {protest.accused.name} (penalty):</label>
            <Autocomplete
              options={accusedPointOptions}
              getOptionLabel={(option) => option.label}
              value={accusedPointOptions.find((o) => o.value === accusedPoints) || null}
              onChange={(_, newValue) => onAccusedPointsChange(newValue?.value ?? null)}
              renderInput={(params) => (
                <TextField {...params} variant="outlined" size="small" placeholder="Select points" />
              )}
              disableClearable={false}
              className="points-panel__autocomplete"
            />
          </div>
        )}

        {/* Submit button */}
        <button
          className="points-panel__btn"
          onClick={onAllocatePoints}
          disabled={actionLoading || filerPoints === null}
        >
          Submit Points
        </button>
      </div>
    </ThemeProvider>
  )
}

export default PointsPanel
