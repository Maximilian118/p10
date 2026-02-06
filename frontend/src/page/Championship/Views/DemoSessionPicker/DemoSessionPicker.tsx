import React from "react"
import Button from "@mui/material/Button"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import "./_demoSessionPicker.scss"

// Session info for each demo option.
interface DemoSessionOption {
  key: number
  circuit: string
  year: number
  session: string
}

interface DemoSessionPickerProps {
  onSessionSelect: (session: { key: number; label: string }) => void
}

// Notable F1 sessions available for demo replay (variety of session types).
const DEMO_SESSIONS: DemoSessionOption[] = [
  { key: 9599, circuit: "Singapore", year: 2024, session: "P1" },
  { key: 9468, circuit: "Sakhir", year: 2024, session: "Q" },
  { key: 9549, circuit: "Spielberg", year: 2024, session: "Sprint" },
  { key: 9523, circuit: "Monte Carlo", year: 2024, session: "Race" },
  { key: 9586, circuit: "Monza", year: 2024, session: "Q" },
  { key: 9558, circuit: "Silverstone", year: 2024, session: "Race" },
  { key: 9668, circuit: "Shanghai", year: 2024, session: "SQ" },
  { key: 9189, circuit: "Las Vegas", year: 2023, session: "Race" },
]

// Builds a display label from session info (2-digit year).
const buildLabel = (s: DemoSessionOption): string =>
  `${s.circuit} - ${s.year % 100} - ${s.session}`

// Displays a list of historical F1 sessions for the user to choose from.
const DemoSessionPicker: React.FC<DemoSessionPickerProps> = ({ onSessionSelect }) => {
  return (
    <div className="demo-picker">
      <p className="f1-session-title">F1 Demo Session</p>

      <div className="demo-picker__sessions">
        {DEMO_SESSIONS.map((session) => (
          <Button
            key={session.key}
            variant="contained"
            className="demo-picker__session-btn"
            startIcon={<SportsMotorsportsIcon />}
            onClick={() => onSessionSelect({ key: session.key, label: buildLabel(session) })}
          >
            {buildLabel(session)}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default DemoSessionPicker
