import { useState, useEffect, useCallback, useContext } from "react"
import { getSocket } from "../../shared/socket/socketClient"
import AppContext from "../../context"
import { getTrackmap } from "./requests/trackmapRequests"
import { TrackmapData, CarPosition, OpenF1SessionStatus, OpenF1DriverInfo } from "./types"

// Socket.IO event names (must match backend OPENF1_EVENTS).
const EVENTS = {
  TRACKMAP: "openf1:trackmap",
  POSITIONS: "openf1:positions",
  SESSION: "openf1:session",
  DRIVERS: "openf1:drivers",
  SUBSCRIBE: "openf1:subscribe",
  UNSUBSCRIBE: "openf1:unsubscribe",
} as const

export type TrackmapConnectionStatus = "connecting" | "connected" | "no_session"

export interface UseTrackmapResult {
  trackPath: { x: number; y: number }[] | null
  carPositions: CarPosition[]
  sessionActive: boolean
  trackName: string
  drivers: OpenF1DriverInfo[]
  connectionStatus: TrackmapConnectionStatus
}

// Hook that provides live F1 track map data and car positions.
// Fetches the initial track map via GraphQL and listens for live updates via Socket.IO.
const useTrackmap = (): UseTrackmapResult => {
  const { user, setUser } = useContext(AppContext)

  const [trackPath, setTrackPath] = useState<{ x: number; y: number }[] | null>(null)
  const [carPositions, setCarPositions] = useState<CarPosition[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [trackName, setTrackName] = useState("")
  const [drivers, setDrivers] = useState<OpenF1DriverInfo[]>([])
  const [connectionStatus, setConnectionStatus] = useState<TrackmapConnectionStatus>("connecting")

  // Fetch the initial track map from the backend on mount.
  const fetchInitialTrackmap = useCallback(async () => {
    const data = await getTrackmap(user, setUser)
    if (data && data.path && data.path.length > 0) {
      setTrackPath(data.path)
      setTrackName(data.trackName)
    }
  }, [user, setUser])

  useEffect(() => {
    fetchInitialTrackmap()
  }, [fetchInitialTrackmap])

  // Subscribe to Socket.IO events for live data.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      setConnectionStatus("connecting")
      return
    }

    // Join the openf1:live room to receive updates.
    socket.emit(EVENTS.SUBSCRIBE)

    // Handle session status updates.
    const handleSession = (data: OpenF1SessionStatus) => {
      setSessionActive(data.active)
      setTrackName(data.trackName)
      setConnectionStatus(data.active ? "connected" : "no_session")
    }

    // Handle track map updates from the backend.
    const handleTrackmap = (data: TrackmapData) => {
      if (data.path && data.path.length > 0) {
        setTrackPath(data.path)
        setTrackName(data.trackName)
      }
    }

    // Handle batched car position updates.
    const handlePositions = (positions: CarPosition[]) => {
      setCarPositions(positions)
    }

    // Handle driver info updates.
    const handleDrivers = (driverList: OpenF1DriverInfo[]) => {
      setDrivers(driverList)
    }

    socket.on(EVENTS.SESSION, handleSession)
    socket.on(EVENTS.TRACKMAP, handleTrackmap)
    socket.on(EVENTS.POSITIONS, handlePositions)
    socket.on(EVENTS.DRIVERS, handleDrivers)

    // Cleanup: leave the room and remove listeners.
    return () => {
      socket.emit(EVENTS.UNSUBSCRIBE)
      socket.off(EVENTS.SESSION, handleSession)
      socket.off(EVENTS.TRACKMAP, handleTrackmap)
      socket.off(EVENTS.POSITIONS, handlePositions)
      socket.off(EVENTS.DRIVERS, handleDrivers)
    }
  }, [])

  return {
    trackPath,
    carPositions,
    sessionActive,
    trackName,
    drivers,
    connectionStatus,
  }
}

export default useTrackmap
