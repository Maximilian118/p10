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
  // Mini-sector segment status arrays (values 0-2064 representing timing status for color coding).
  segments_sector_1: number[] | null
  segments_sector_2: number[] | null
  segments_sector_3: number[] | null
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

// Car telemetry from the v1/car_data MQTT topic (~3.7Hz per driver).
export interface OpenF1CarDataMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  date: string
  brake: number
  drs: number
  n_gear: number
  rpm: number
  speed: number
  throttle: number
  _key: string
  _id: number
}

// Interval data from the v1/intervals MQTT topic (~4s updates during races).
export interface OpenF1IntervalMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  date: string
  gap_to_leader: number | string | null
  interval: number | string | null
  _key: string
  _id: number
}

// Pit lane activity from the v1/pit MQTT topic.
export interface OpenF1PitMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  date: string
  lap_number: number
  pit_duration: number | null
  stop_duration: number | null
  lane_duration: number | null
  _key: string
  _id: number
}

// Stint data from the v1/stints MQTT topic.
export interface OpenF1StintMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  compound: string
  stint_number: number
  lap_start: number
  lap_end: number | null
  tyre_age_at_start: number
  _key: string
  _id: number
}

// Race position from the v1/position MQTT topic.
export interface OpenF1PositionMsg {
  meeting_key: number
  session_key: number
  driver_number: number
  date: string
  position: number
  _key: string
  _id: number
}

// Race control messages from the v1/race_control MQTT topic.
export interface OpenF1RaceControlMsg {
  meeting_key: number
  session_key: number
  date: string
  category: string
  message: string
  flag: string | null
  scope: string | null
  sector: number | null
  driver_number: number | null
  lap_number: number | null
  _key: string
  _id: number
}

// Weather data from the v1/weather MQTT topic (~1 min updates).
export interface OpenF1WeatherMsg {
  meeting_key: number
  session_key: number
  date: string
  air_temperature: number
  track_temperature: number
  humidity: number
  pressure: number
  rainfall: number
  wind_speed: number
  wind_direction: number
  _key: string
  _id: number
}

// Overtake data from the v1/overtakes MQTT topic (race sessions only).
export interface OpenF1OvertakeMsg {
  meeting_key: number
  session_key: number
  date: string
  overtaking_driver_number: number
  overtaken_driver_number: number
  position: number
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
  headshotUrl: string | null
}

// A single car position for Socket.IO relay to frontend.
export interface CarPositionPayload {
  driverNumber: number
  x: number
  y: number
  progress?: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

// Corner label position from MultiViewer track data.
export interface Corner {
  number: number
  trackPosition: { x: number; y: number }
}

// Sector boundary positions stored as track progress values (0-1).
export interface SectorBoundaries {
  startFinish: number
  sector1_2: number
  sector2_3: number
}

// Validated lap used for track map construction.
export interface ValidatedLap {
  driverNumber: number
  lapNumber: number
  lapDuration: number
  positions: { x: number; y: number; date: string }[]
}

// ─── Aggregated State Types (emitted to frontend via Socket.IO) ──

// Per-driver live state snapshot emitted as an array every ~1s.
export interface DriverLiveState {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
  headshotUrl: string | null

  // Position & Intervals
  position: number | null
  gapToLeader: number | string | null
  interval: number | string | null

  // Lap Data
  currentLapNumber: number
  lastLapTime: number | null
  bestLapTime: number | null

  // Sector times from the latest completed lap.
  sectorTimes: { s1: number | null; s2: number | null; s3: number | null }

  // Mini-sector segment status arrays for color coding.
  segments: {
    sector1: number[]
    sector2: number[]
    sector3: number[]
  }

  // Tyre & Pit
  tyreCompound: string | null
  tyreAge: number
  inPit: boolean
  pitStops: number
  isPitOutLap: boolean

  // Telemetry snapshot (latest values).
  speed: number
  drs: number
  gear: number

  // Speed trap values from the latest completed lap.
  i1Speed: number | null
  i2Speed: number | null
  stSpeed: number | null
}

// Session-wide live state emitted on change.
export interface SessionLiveState {
  weather: {
    airTemperature: number
    trackTemperature: number
    humidity: number
    rainfall: boolean
    windSpeed: number
    windDirection: number
    pressure: number
  } | null
  raceControlMessages: RaceControlEvent[]
  overtakes: OvertakeEvent[]
}

// A single race control event for the session timeline.
export interface RaceControlEvent {
  date: string
  category: string
  message: string
  flag: string | null
  scope: string | null
  sector: number | null
  driverNumber: number | null
  lapNumber: number | null
}

// A single overtake event.
export interface OvertakeEvent {
  date: string
  overtakingDriverNumber: number
  overtakenDriverNumber: number
  position: number
}

// ─── Internal Sub-State Types ────────────────────────────────────

// Interval data tracked per driver.
export interface DriverIntervalState {
  gapToLeader: number | string | null
  interval: number | string | null
}

// Current stint data tracked per driver.
export interface DriverStintState {
  compound: string
  stintNumber: number
  lapStart: number
  tyreAgeAtStart: number
}

// Pit stop data tracked per driver.
export interface DriverPitState {
  count: number
  lastDuration: number | null
  inPit: boolean
}

// Latest telemetry snapshot per driver.
export interface DriverCarDataState {
  speed: number
  drs: number
  gear: number
}

// Current state of an active session being tracked.
export interface SessionState {
  sessionKey: number
  meetingKey: number
  trackName: string
  sessionType: string
  sessionName: string
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
  // Corner positions from MultiViewer (null if unavailable or GPS-only map).
  corners: Corner[] | null
  // Computed sector boundary progress values (null until enough data is available).
  sectorBoundaries: SectorBoundaries | null
  // Whether this session is a demo replay (skips incremental track rebuilding).
  isDemo: boolean
  // Pre-computed arc-length tables for GPS and MultiViewer paths (cached to avoid per-tick recomputation).
  baselineArcLengths: number[] | null
  multiviewerArcLengths: number[] | null

  // ─── Live data state (populated by new MQTT topics) ─────────
  // Race position per driver.
  driverPositions: Map<number, number>
  // Interval/gap data per driver.
  driverIntervals: Map<number, DriverIntervalState>
  // Current stint per driver.
  driverStints: Map<number, DriverStintState>
  // Pit stop tracking per driver.
  driverPitStops: Map<number, DriverPitState>
  // Latest car telemetry per driver.
  driverCarData: Map<number, DriverCarDataState>
  // Best lap time per driver.
  driverBestLap: Map<number, number>
  // Current weather conditions.
  weather: SessionLiveState["weather"]
  // Race control messages accumulated during the session.
  raceControlMessages: RaceControlEvent[]
  // Overtake events accumulated during the session.
  overtakes: OvertakeEvent[]
  // Expected session end timestamp (ms epoch) — used for fallback countdown when SignalR is unavailable.
  dateEndTs: number
}
