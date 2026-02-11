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

// Track map path data received from the backend.
export interface TrackmapData {
  trackName: string
  path: { x: number; y: number }[]
  pathVersion: number
  totalLapsProcessed: number
  corners?: Corner[]
  sectorBoundaries?: SectorBoundaries | null
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
}

// Driver info from the backend.
export interface OpenF1DriverInfo {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
}
