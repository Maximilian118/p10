// ─── MQTT Message Types ───────────────────────────────────────────

// Position update from the v1/location MQTT topic.
export interface OpenF1LocationMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  date: string
  x: number
  y: number
  z: number
  _key: string
  _id: number
}

// Lap completion from the v1/laps MQTT topic.
export interface OpenF1LapMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  lap_number: number
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  is_pit_out_lap: boolean
  i1_speed: number | null
  i2_speed: number | null
  st_speed: number | null
  date_start: string | null
  _key: string
  _id: number
}

// Session status from the v1/sessions MQTT topic.
export interface OpenF1SessionMsg {
  meeting_key: number
  session_key: number
  session_name: string
  session_type: string
  status: string
  date_start: string | null
  date_end: string | null
  circuit_short_name: string | null
  circuit_key: number | null
  _key: string
  _id: number
}

// Driver info from the v1/drivers MQTT topic or REST endpoint.
export interface OpenF1DriverMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  headshot_url: string | null
  _key: string
  _id: number
}

// Meeting info from the REST /v1/meetings endpoint.
export interface OpenF1Meeting {
  meeting_key: number
  meeting_name: string
  meeting_official_name: string
  circuit_key: number
  circuit_short_name: string
  country_name: string
  date_start: string
  year: number
}

// ─── Internal State Types ─────────────────────────────────────────

// Processed driver info for Socket.IO relay to frontend.
export interface DriverInfo {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

// A single car position for Socket.IO relay to frontend.
export interface CarPositionPayload {
  driverNumber: number
  x: number
  y: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

// Validated lap used for track map construction.
export interface ValidatedLap {
  driverNumber: number
  lapNumber: number
  lapDuration: number
  positions: { x: number; y: number; date: string }[]
}

// Current state of an active session being tracked.
export interface SessionState {
  sessionKey: number
  meetingKey: number
  trackName: string
  sessionType: string
  drivers: Map<number, DriverInfo>
  // Position data per driver per lap: Map<driverNumber, Map<lapNumber, positions[]>>
  positionsByDriverLap: Map<number, Map<number, { x: number; y: number; date: string }[]>>
  // Current position per driver (latest received).
  currentPositions: Map<number, { x: number; y: number }>
  // Current lap per driver (from lap messages).
  currentLapByDriver: Map<number, number>
  // Completed laps keyed by "driverNumber-lapNumber" (deduplicates progressive MQTT updates).
  completedLaps: Map<string, OpenF1LapMsg>
  // Best lap time in the session (for 107% filtering).
  bestLapTime: number
  // Track map state.
  totalLapsProcessed: number
  lastUpdateLap: number
  baselinePath: { x: number; y: number }[] | null
  // MultiViewer high-fidelity track outline (null if unavailable — GPS path used as fallback).
  multiviewerPath: { x: number; y: number }[] | null
}
