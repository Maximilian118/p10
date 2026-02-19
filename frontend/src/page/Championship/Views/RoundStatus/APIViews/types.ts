import { RoundType } from "../../../../../shared/types"

// Common props all APIView session components receive.
export interface APIViewProps {
  round?: RoundType
  isAdjudicator?: boolean
  onAdvance?: () => void
  demoMode?: boolean
  sessionLabel?: string
  demoEnded?: boolean
  trackFlag?: string | null
  safetyCar?: boolean
  medicalCar?: boolean
}

// A demo session selection from the picker.
export interface DemoSession {
  key: number
  label: string
}

// Per-series configuration bundle.
// Adding a new series means creating one of these and registering it.
export interface SeriesConfig {
  View: React.ComponentType<APIViewProps>
  DemoPicker: React.ComponentType<{ onSelect: (session: DemoSession) => void }>
}
