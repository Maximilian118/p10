// Corner label position from MultiViewer track data.
export interface Corner {
  number: number
  trackPosition: { x: number; y: number }
}

// Sector boundary positions as track progress values (0-1).
export interface SectorBoundaries {
  startFinish: number
  sector1_2: number
  sector2_3: number
}

// Telemetry-derived pit lane profile for rendering the pit building and detecting pit exits.
export interface PitLaneProfile {
  exitSpeed: number
  pitLaneMaxSpeed: number
  pitLaneSpeedLimit: number
  samplesCollected: number
  entryProgress: number
  exitProgress: number
  pitSide: number
  pitSideConfidence: number     // 0-1 agreement ratio across all GPS readings
  referenceWindingCW?: boolean  // Winding direction of the path used to compute pitSide
}

// Track map path data received from the backend.
export interface TrackmapData {
  trackName: string
  path: { x: number; y: number }[]
  pathVersion: number
  totalLapsProcessed: number
  corners?: Corner[]
  sectorBoundaries?: SectorBoundaries | null
  pitLaneProfile?: PitLaneProfile | null
  rotationOverride?: number
}

// Live car position received from backend Socket.IO.
export interface CarPosition {
  driverNumber: number
  x: number
  y: number
  progress?: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}

// Session status from the backend.
export interface OpenF1SessionStatus {
  active: boolean
  trackName: string
  sessionType: string
  sessionName: string
}

// Driver info from the backend.
export interface OpenF1DriverInfo {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
  headshotUrl: string | null
}

// Per-driver live state snapshot received from the backend every ~1s.
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
  retired: boolean

  // Telemetry snapshot.
  speed: number
  drs: number
  gear: number

  // Speed trap values from the latest completed lap.
  i1Speed: number | null
  i2Speed: number | null
  stSpeed: number | null
}

// A single race control event.
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

// Generic session clock update — series-agnostic.
// Live: sourced from F1 Live Timing ExtrapolatedClock (speed=1).
// Demo: sourced from stored synthetic clock events (speed=replaySpeed).
export interface SessionClock {
  remainingMs: number  // session time remaining (ms)
  running: boolean     // is the clock actively counting down?
  serverTs: number     // when this update was emitted (ms epoch)
  speed: number        // playback speed (1 for live, >1 for accelerated demo)
}

// Session-wide live state received from the backend on change.
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
