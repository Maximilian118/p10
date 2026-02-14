import React from "react"
import Button from "@mui/material/Button"
import "./_demoSessionPicker.scss"
import { DemoSession } from "../../types"

// Session info for each demo option.
interface DemoSessionOption {
  key: number
  circuit: string
  year: number
  session: string
}

interface DemoSessionPickerProps {
  onSelect: (session: DemoSession) => void
}

// Notable F1 race sessions available for demo replay.
const DEMO_SESSIONS: DemoSessionOption[] = [
  { key: 9606, circuit: "Singapore", year: 2024, session: "Race" },
  { key: 9472, circuit: "Sakhir", year: 2024, session: "Race" },
  { key: 9550, circuit: "Spielberg", year: 2024, session: "Race" },
  { key: 9523, circuit: "Monte Carlo", year: 2024, session: "Race" },
  { key: 9590, circuit: "Monza", year: 2024, session: "Race" },
  { key: 9558, circuit: "Silverstone", year: 2024, session: "Race" },
  { key: 9673, circuit: "Shanghai", year: 2024, session: "Race" },
  { key: 9189, circuit: "Las Vegas", year: 2023, session: "Race" },
]

// Builds a display label from session info.
const buildLabel = (s: DemoSessionOption): string => s.circuit

// Displays a list of historical F1 sessions for the user to choose from.
const DemoSessionPicker: React.FC<DemoSessionPickerProps> = ({ onSelect }) => {
  return (
    <div className="demo-picker">
      <p className="f1-session-title">F1 Demo Session</p>

      <div className="demo-picker__sessions">
        {DEMO_SESSIONS.map((session) => (
          <Button
            key={session.key}
            variant="contained"
            className="demo-picker__session-btn"
            onClick={() => onSelect({ key: session.key, label: buildLabel(session) })}
          >
            {buildLabel(session)}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default DemoSessionPicker
