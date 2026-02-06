// Track map path data received from the backend.
export interface TrackmapData {
  trackName: string
  path: { x: number; y: number }[]
  pathVersion: number
  totalLapsProcessed: number
}

// Live car position received from backend Socket.IO.
export interface CarPosition {
  driverNumber: number
  x: number
  y: number
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
