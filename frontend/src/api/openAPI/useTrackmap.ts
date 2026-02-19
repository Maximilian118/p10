import { useState, useEffect, useCallback, useContext, useRef } from "react"
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
  DRIVER_FLAG: "openf1:driver-flag",
  TRACK_FLAG: "openf1:track-flag",
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
  driverFlags: Map<number, string>
  trackFlag: string | null
}

// Hook that provides live F1 track map data and car positions.
// Fetches the initial track map via GraphQL and listens for live updates via Socket.IO.
// When demoMode is true, subscribes as a demo viewer (isolated from live data).
const useTrackmap = (demoMode?: boolean): UseTrackmapResult => {
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
  const [driverFlags, setDriverFlags] = useState<Map<number, string>>(new Map())
  const [trackFlag, setTrackFlag] = useState<string | null>(null)

  // Timers for auto-expiring driver flags after 3 seconds.
  const driverFlagTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Fetch the initial track map from the backend on mount.
  const fetchInitialTrackmap = useCallback(async () => {
    const data = await getTrackmap(user, setUser)
    if (data && data.path && data.path.length > 0) {
      setTrackPath(data.path)
      setTrackName(data.trackName)
    }
  }, [user, setUser])

  // Skip REST fetch in demo mode — demo gets its trackmap via the socket.
  useEffect(() => {
    if (!demoMode) fetchInitialTrackmap()
  }, [fetchInitialTrackmap, demoMode])

  // Subscribe to Socket.IO events for live data.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      setConnectionStatus("connecting")
      return
    }

    // Join the openf1:live room (or demo channel) to receive updates.
    socket.emit(EVENTS.SUBSCRIBE, demoMode ? { demoMode: true } : undefined)

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

    // Handle track-wide flag status (GREEN, YELLOW, RED, SC, VSC, etc.).
    const handleTrackFlag = (flag: string) => {
      setTrackFlag(flag)
    }

    // Handle driver-specific flag events (e.g. BLUE flag). Sets a flag that
    // auto-expires after 3 seconds, used by Trackmap to flash the car dot.
    const handleDriverFlag = (data: { driverNumber: number; flag: string }) => {
      setDriverFlags((prev) => {
        const next = new Map(prev)
        next.set(data.driverNumber, data.flag)
        return next
      })
      // Clear existing timer for this driver if any.
      const existing = driverFlagTimers.current.get(data.driverNumber)
      if (existing) clearTimeout(existing)
      // Remove the flag after 3 seconds.
      const timer = setTimeout(() => {
        setDriverFlags((prev) => {
          const next = new Map(prev)
          next.delete(data.driverNumber)
          return next
        })
        driverFlagTimers.current.delete(data.driverNumber)
      }, 3000)
      driverFlagTimers.current.set(data.driverNumber, timer)
    }

    socket.on(EVENTS.SESSION, handleSession)
    socket.on(EVENTS.TRACKMAP, handleTrackmap)
    socket.on(EVENTS.POSITIONS, handlePositions)
    socket.on(EVENTS.DRIVERS, handleDrivers)
    socket.on(EVENTS.DRIVER_STATES, handleDriverStates)
    socket.on(EVENTS.SESSION_STATE, handleSessionState)
    socket.on(EVENTS.RACE_CONTROL, handleRaceControl)
    socket.on(EVENTS.DRIVER_FLAG, handleDriverFlag)
    socket.on(EVENTS.TRACK_FLAG, handleTrackFlag)
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
      socket.off(EVENTS.DRIVER_FLAG, handleDriverFlag)
      socket.off(EVENTS.TRACK_FLAG, handleTrackFlag)
      driverFlagTimers.current.forEach((t) => clearTimeout(t))
      driverFlagTimers.current.clear()
    }
  }, [demoMode])

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
    driverFlags,
    trackFlag,
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
