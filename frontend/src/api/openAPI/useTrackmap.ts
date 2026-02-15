import { useState, useEffect, useCallback, useContext } from "react"
import { getSocket } from "../../shared/socket/socketClient"
import AppContext from "../../context"
import { getTrackmap } from "./requests/trackmapRequests"
import { TrackmapData, CarPosition, OpenF1SessionStatus, OpenF1DriverInfo, DriverLiveState, SessionLiveState, RaceControlEvent, Corner, SectorBoundaries, PitLaneProfile } from "./types"

// Socket.IO event names (must match backend OPENF1_EVENTS).
const EVENTS = {
  TRACKMAP: "openf1:trackmap",
  POSITIONS: "openf1:positions",
  SESSION: "openf1:session",
  DRIVERS: "openf1:drivers",
  DRIVER_STATES: "openf1:driver-states",
  SESSION_STATE: "openf1:session-state",
  RACE_CONTROL: "openf1:race-control",
  DEMO_STATUS: "openf1:demo-status",
  SUBSCRIBE: "openf1:subscribe",
  UNSUBSCRIBE: "openf1:unsubscribe",
} as const

export type TrackmapConnectionStatus = "connecting" | "connected" | "no_session"
export type DemoPhase = "idle" | "fetching" | "ready" | "stopped" | "ended"

export interface UseTrackmapResult {
  trackPath: { x: number; y: number }[] | null
  carPositions: CarPosition[]
  sessionActive: boolean
  trackName: string
  sessionName: string
  drivers: OpenF1DriverInfo[]
  driverStates: DriverLiveState[]
  sessionState: SessionLiveState | null
  corners: Corner[] | null
  sectorBoundaries: SectorBoundaries | null
  pitLaneProfile: PitLaneProfile | null
  rotationOverride: number
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
  const [sessionName, setSessionName] = useState("")
  const [drivers, setDrivers] = useState<OpenF1DriverInfo[]>([])
  const [corners, setCorners] = useState<Corner[] | null>(null)
  const [sectorBoundaries, setSectorBoundaries] = useState<SectorBoundaries | null>(null)
  const [pitLaneProfile, setPitLaneProfile] = useState<PitLaneProfile | null>(null)
  const [rotationOverride, setRotationOverride] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<TrackmapConnectionStatus>("connecting")
  const [driverStates, setDriverStates] = useState<DriverLiveState[]>([])
  const [sessionState, setSessionState] = useState<SessionLiveState | null>(null)

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
      setSessionName(data.sessionName || "")
      setConnectionStatus(data.active ? "connected" : "no_session")
    }

    // Handle track map updates from the backend.
    const handleTrackmap = (data: TrackmapData) => {
      if (data.path && data.path.length > 0) {
        setTrackPath(data.path)
        setTrackName(data.trackName)
      }
      setCorners(data.corners ?? null)
      setSectorBoundaries(data.sectorBoundaries ?? null)
      setPitLaneProfile(data.pitLaneProfile ?? null)
      setRotationOverride(data.rotationOverride ?? 0)
    }

    // Handle batched car position updates. CSS transitions on CarDot handle
    // smooth interpolation, so React re-renders at 10 Hz are fine — React.memo
    // on each CarDot ensures only dots with changed positions actually re-render.
    const handlePositions = (positions: CarPosition[]) => {
      setCarPositions(positions)
    }

    // Handle driver info updates.
    const handleDrivers = (driverList: OpenF1DriverInfo[]) => {
      setDrivers(driverList)
    }

    // Handle aggregated driver live state snapshots.
    const handleDriverStates = (states: DriverLiveState[]) => {
      setDriverStates(states)
    }

    // Handle session-wide state updates (weather, race control, overtakes).
    const handleSessionState = (state: SessionLiveState) => {
      setSessionState(state)
    }

    // Handle individual race control events (append to existing session state).
    const handleRaceControl = (event: RaceControlEvent) => {
      setSessionState((prev) => {
        if (!prev) return { weather: null, raceControlMessages: [event], overtakes: [] }
        return { ...prev, raceControlMessages: [...prev.raceControlMessages, event] }
      })
    }

    socket.on(EVENTS.SESSION, handleSession)
    socket.on(EVENTS.TRACKMAP, handleTrackmap)
    socket.on(EVENTS.POSITIONS, handlePositions)
    socket.on(EVENTS.DRIVERS, handleDrivers)
    socket.on(EVENTS.DRIVER_STATES, handleDriverStates)
    socket.on(EVENTS.SESSION_STATE, handleSessionState)
    socket.on(EVENTS.RACE_CONTROL, handleRaceControl)
    // Cleanup: leave the room and remove listeners.
    return () => {
      socket.emit(EVENTS.UNSUBSCRIBE)
      socket.off(EVENTS.SESSION, handleSession)
      socket.off(EVENTS.TRACKMAP, handleTrackmap)
      socket.off(EVENTS.POSITIONS, handlePositions)
      socket.off(EVENTS.DRIVERS, handleDrivers)
      socket.off(EVENTS.DRIVER_STATES, handleDriverStates)
      socket.off(EVENTS.SESSION_STATE, handleSessionState)
      socket.off(EVENTS.RACE_CONTROL, handleRaceControl)
    }
  }, [])

  return {
    trackPath,
    carPositions,
    sessionActive,
    trackName,
    sessionName,
    drivers,
    driverStates,
    sessionState,
    corners,
    sectorBoundaries,
    pitLaneProfile,
    rotationOverride,
    connectionStatus,
  }
}

// Lightweight hook for demo status only (phase, remaining time, start time).
// Does NOT subscribe to the openf1:live room — use alongside a component
// that already calls useTrackmap (e.g. Trackmap) to avoid double subscription.
export const useDemoStatus = (): { demoPhase: DemoPhase; demoRemainingMs: number; demoStartedAt: number } => {
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle")
  const [demoRemainingMs, setDemoDurationMs] = useState(0)
  const [demoStartedAt, setDemoStartedAt] = useState(0)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleDemoStatus = (data: { phase: DemoPhase; remainingMs?: number }) => {
      setDemoPhase(data.phase)
      if (data.phase === "ready" && data.remainingMs) {
        setDemoDurationMs(data.remainingMs)
        setDemoStartedAt(Date.now())
      }
    }

    socket.on(EVENTS.DEMO_STATUS, handleDemoStatus)
    return () => { socket.off(EVENTS.DEMO_STATUS, handleDemoStatus) }
  }, [])

  return { demoPhase, demoRemainingMs, demoStartedAt }
}

export default useTrackmap
