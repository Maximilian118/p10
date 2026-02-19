import { useState, useEffect } from "react"
import { getSocket } from "../../shared/socket/socketClient"
import { DriverLiveState, SessionClock } from "./types"

// Socket event names (must match backend OPENF1_EVENTS).
const EVENTS = {
  TRACK_FLAG: "openf1:track-flag",
  DEMO_STATUS: "openf1:demo-status",
  CLOCK: "session:clock",
  DRIVER_STATES: "openf1:driver-states",
  SESSION_STATE: "openf1:session-state",
  MEDICAL_CAR: "openf1:medical-car",
} as const

type DemoPhase = "idle" | "fetching" | "ready" | "stopped" | "ended"

// Public return type — SessionStats uses currentFlag/remainingMs/lap counts,
// F1SessionView uses demoEnded for the "End of Demo" title,
// and safetyCar/medicalCar booleans for the SC/MC indicator pill.
export interface SessionBannerData {
  currentFlag: string | null
  remainingMs: number
  demoEnded: boolean
  currentLap: number
  totalLaps: number | null
  safetyCar: boolean
  medicalCar: boolean
}

// Consolidates all session banner logic: socket listeners for track flag/demo status,
// clock extrapolation via requestAnimationFrame, and lap count tracking.
// Championship.tsx only needs to pass `enabled` (isAPISessionView) and `isDemoMode`.
export const useSessionBanner = (enabled: boolean, isDemoMode: boolean): SessionBannerData => {
  const [currentFlag, setCurrentFlag] = useState<string | null>(null)
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle")
  const [medicalCar, setMedicalCar] = useState(false)

  // Clock state — driven by session:clock events from the backend.
  const [clock, setClock] = useState<SessionClock | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)

  // Lap count state — currentLap from driver states, totalLaps from session state.
  const [currentLap, setCurrentLap] = useState(0)
  const [totalLaps, setTotalLaps] = useState<number | null>(null)

  // Socket listeners for track flag, demo status, clock, driver states, session state, and medical car.
  useEffect(() => {
    if (!enabled) {
      setCurrentFlag(null)
      setDemoPhase("idle")
      setClock(null)
      setRemainingMs(0)
      setCurrentLap(0)
      setTotalLaps(null)
      setMedicalCar(false)
      return
    }

    const socket = getSocket()
    if (!socket) return

    // Receives the backend-computed track-wide flag status directly.
    const handleTrackFlag = (flag: string) => {
      setCurrentFlag(flag)
    }

    // Handles demo status updates (phase only — timing data comes via session:clock).
    const handleDemoStatus = (data: { phase: DemoPhase }) => {
      setDemoPhase(data.phase)
    }

    // Handles session clock updates from the backend (live or demo).
    const handleClock = (data: SessionClock) => {
      setClock(data)
    }

    // Extracts the leader's lap from driver states (emitted ~1s).
    const handleDriverStates = (states: DriverLiveState[]) => {
      if (states.length > 0) {
        setCurrentLap(Math.max(0, ...states.map(s => s.currentLapNumber)))
      }
    }

    // Extracts total laps from session-wide state (emitted on connect + updates).
    const handleSessionState = (data: { totalLaps?: number | null; currentLap?: number }) => {
      if (data.totalLaps !== undefined) setTotalLaps(data.totalLaps)
      if (data.currentLap !== undefined) setCurrentLap(data.currentLap)
    }

    // Receives medical car deployment status from the backend.
    const handleMedicalCar = (active: boolean) => {
      setMedicalCar(active)
    }

    socket.on(EVENTS.TRACK_FLAG, handleTrackFlag)
    socket.on(EVENTS.DEMO_STATUS, handleDemoStatus)
    socket.on(EVENTS.CLOCK, handleClock)
    socket.on(EVENTS.DRIVER_STATES, handleDriverStates)
    socket.on(EVENTS.SESSION_STATE, handleSessionState)
    socket.on(EVENTS.MEDICAL_CAR, handleMedicalCar)

    return () => {
      socket.off(EVENTS.TRACK_FLAG, handleTrackFlag)
      socket.off(EVENTS.DEMO_STATUS, handleDemoStatus)
      socket.off(EVENTS.CLOCK, handleClock)
      socket.off(EVENTS.DRIVER_STATES, handleDriverStates)
      socket.off(EVENTS.SESSION_STATE, handleSessionState)
      socket.off(EVENTS.MEDICAL_CAR, handleMedicalCar)
    }
  }, [enabled])

  // Clock extrapolation via requestAnimationFrame.
  // When the clock is running, we extrapolate: remainingMs - (elapsed * speed).
  // When paused (running=false) or demo ended, we display the frozen value.
  useEffect(() => {
    if (!enabled || !clock) return

    // Freeze clock when demo has ended or clock is paused (e.g. red flag).
    if (demoPhase === "ended" || !clock.running) {
      setRemainingMs(Math.max(0, clock.remainingMs))
      return
    }

    // Clock is running — extrapolate between server updates.
    let rafId: number
    const tick = () => {
      const elapsed = Date.now() - clock.serverTs
      setRemainingMs(Math.max(0, clock.remainingMs - elapsed * clock.speed))
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [enabled, clock, demoPhase])

  const demoEnded = isDemoMode && demoPhase === "ended"

  // Derive safety car boolean from the track flag (SC, VSC, and VSC_ENDING all indicate active SC).
  const safetyCar = currentFlag === "SC" || currentFlag === "VSC" || currentFlag === "VSC_ENDING"

  return { currentFlag, remainingMs, demoEnded, currentLap, totalLaps, safetyCar, medicalCar }
}
