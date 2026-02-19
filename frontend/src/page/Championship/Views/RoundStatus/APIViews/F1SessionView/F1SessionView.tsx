import React, { useState, useCallback, useMemo, useContext, useRef, useEffect, useLayoutEffect } from "react"
import "./_f1SessionView.scss"
import Button from "@mui/material/Button"
import Trackmap from "../../../../../../api/openAPI/components/Trackmap/Trackmap"
import { DriverLiveState, SessionLiveState, RaceControlEvent } from "../../../../../../api/openAPI/types"
import { AcceptedSegments } from "../../../../../../api/openAPI/openF1Utility"
import { RoundType, driverType } from "../../../../../../shared/types"
import F1DriverCard from "./F1DriverCard/F1DriverCard"
import TempGauge from "./TempGauge/TempGauge"
import FillLoading from "../../../../../../components/utility/fillLoading/FillLoading"
import { Loop } from "@mui/icons-material"
import { CloudRain, Sun, Flag } from "lucide-react"
import AppContext from "../../../../../../context"
import { setTrackmapRotation } from "../../../../../../api/openAPI/requests/trackmapRequests"

interface F1SessionViewProps {
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

// View displayed when betting has closed for F1 series or during demo mode.
// Shows live track map with car positions and driver cards from OpenF1 data.
// Drag sensitivity: degrees of rotation per pixel of vertical mouse movement.
const ROTATION_SENSITIVITY = 1

const F1SessionView: React.FC<F1SessionViewProps> = ({
  round,
  isAdjudicator,
  onAdvance,
  demoMode,
  sessionLabel,
  demoEnded,
  trackFlag,
  safetyCar,
  medicalCar,
}) => {
  const { user, setUser } = useContext(AppContext)
  const [driverView, setDriverView] = useState<DriverLiveState | null>(null)
  const [trackReady, setTrackReady] = useState(false)
  const [driverStates, setDriverStates] = useState<DriverLiveState[]>([])
  const [sessionInfo, setSessionInfo] = useState<{ trackName: string; sessionName: string } | null>(null)
  // Tracks whether a live session is currently active on the backend.
  const [sessionActive, setSessionActive] = useState<boolean | null>(null)
  // Tracks whether the session was active and then ended (for "Finalising Round..." state).
  const [sessionEnded, setSessionEnded] = useState(false)
  // Accepted pill segments for all drivers (computed by Trackmap using visual car position).
  const [pillSegments, setPillSegments] = useState<Map<number, AcceptedSegments>>(new Map())
  // Weather data forwarded from the Trackmap's useTrackmap hook.
  const [weather, setWeather] = useState<SessionLiveState["weather"]>(null)
  // Race control messages forwarded from the Trackmap's useTrackmap hook.
  const [raceControlMessages, setRaceControlMessages] = useState<RaceControlEvent[]>([])
  // Toggles between driver list and race control messages panel.
  const [showRaceControl, setShowRaceControl] = useState(false)

  // ─── Rotation drag state (admin only) ─────────────────────────
  const [dragRotationDelta, setDragRotationDelta] = useState(0)
  const dragStartY = useRef(0)
  const isDragging = useRef(false)

  // Attaches window-level mousemove/mouseup listeners while dragging.
  useEffect(() => {
    if (!isDragging.current) return

    const handleMouseMove = (e: MouseEvent) => {
      // Upward drag (negative deltaY) = positive rotation (clockwise).
      setDragRotationDelta(-(e.clientY - dragStartY.current) * ROTATION_SENSITIVITY)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      setDragRotationDelta(0)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  })

  // Starts the rotation drag from the Loop icon.
  const handleRotationDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    isDragging.current = true
    setDragRotationDelta(0)
  }, [])

  // Called by Trackmap when a drag ends — saves the new rotation to the backend.
  const handleRotationSave = useCallback((trackName: string, rotation: number) => {
    setTrackmapRotation(user, setUser, trackName, rotation)
  }, [user, setUser])

  const advButton = !demoMode && isAdjudicator && onAdvance

  // Build a lookup map from driverID (3-letter acronym) to championship driver.
  const champDriverMap = useMemo(() => {
    const map = new Map<string, driverType>()
    if (!round?.drivers) return map
    round.drivers.forEach((entry) => {
      if (entry.driver?.driverID) {
        map.set(entry.driver.driverID, entry.driver)
      }
    })
    return map
  }, [round])

  // Toggles driver view — selects a driver by number or clears the selection.
  const handleDriverViewSelect = useCallback((driverNumber: number | null) => {
    if (driverNumber === null || driverView?.driverNumber === driverNumber) {
      setDriverView(null)
    } else {
      const match = driverStates.find((d) => d.driverNumber === driverNumber)
      setDriverView(match ?? null)
    }
  }, [driverView, driverStates])

  // Handles driver selection from the track map (car dot click or SVG background click).
  const handleMapDriverSelect = useCallback((driver: { driverNumber: number } | null) => {
    handleDriverViewSelect(driver?.driverNumber ?? null)
  }, [handleDriverViewSelect])

  // Called once by the Trackmap component when track data first arrives.
  const handleTrackReady = useCallback(() => {
    setTrackReady(true)
  }, [])

  // Receives aggregated driver live states from the Trackmap.
  const handleDriverStatesUpdate = useCallback((states: DriverLiveState[]) => {
    setDriverStates(states)
  }, [])

  // Receives exit-based accepted segments from the Trackmap for all drivers.
  const handlePillSegments = useCallback((map: Map<number, AcceptedSegments>) => {
    setPillSegments(map)
  }, [])

  // Receives weather data from the Trackmap's session state.
  const handleWeatherUpdate = useCallback((w: SessionLiveState["weather"]) => {
    setWeather(w)
  }, [])

  // Receives race control messages from the Trackmap's session state.
  const handleRaceControlUpdate = useCallback((messages: RaceControlEvent[]) => {
    setRaceControlMessages(messages)
  }, [])

  // Handles session active state changes from the Trackmap.
  // Detects when a live session ends (was active, now inactive) to show "Finalising Round...".
  const handleSessionActiveChange = useCallback((active: boolean) => {
    if (!demoMode && sessionActive === true && !active) {
      setSessionEnded(true)
    }
    setSessionActive(active)
  }, [demoMode, sessionActive])

  // Sorts race control messages by date descending (most recent first) and
  // removes duplicates caused by both session-state snapshots and individual
  // race-control events containing the same message.
  const sortedRaceControl = useMemo(() => {
    const seen = new Set<string>()
    return [...raceControlMessages]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((msg) => {
        const key = `${msg.date}|${msg.message}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [raceControlMessages])

  // Sorts drivers by race position (P1 at top). Null positions sink to the bottom.
  const sortedStates = useMemo(() =>
    [...driverStates].sort((a, b) => {
      if (a.position === null && b.position === null) return 0
      if (a.position === null) return 1
      if (b.position === null) return -1
      return a.position - b.position
    }),
  [driverStates])

  // ─── FLIP animation for position changes ─────────────────────────
  const listRef = useRef<HTMLDivElement>(null)
  const prevTops = useRef<Map<number, number>>(new Map())

  // After React reorders the DOM, slide cards from their old positions to new ones.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    const children = Array.from(el.children) as HTMLElement[]
    const newTops = new Map<number, number>()

    // Measure each card's new offsetTop and map it to the corresponding driver.
    children.forEach((child, i) => {
      if (i < sortedStates.length) {
        newTops.set(sortedStates[i].driverNumber, child.offsetTop)
      }
    })

    // Animate cards that moved: start at old position, transition to new position.
    children.forEach((child, i) => {
      if (i >= sortedStates.length) return
      const driverNum = sortedStates[i].driverNumber
      const prevTop = prevTops.current.get(driverNum)
      const newTop = newTops.get(driverNum)!

      if (prevTop !== undefined && prevTop !== newTop) {
        const delta = prevTop - newTop
        child.style.transform = `translateY(${delta}px)`
        child.style.transition = "none"
        void child.offsetHeight // force reflow so the browser registers the start position
        child.style.transition = "transform 0.3s ease"
        child.style.transform = ""
      }
    })

    prevTops.current = newTops
  }, [driverStates, sortedStates])

  // Show "Finalising Round..." when a live session has ended and we're waiting for results.
  if (!demoMode && sessionEnded) {
    return (
      <div className="f1-session-view">
        <FillLoading text="Finalising Round..." />
      </div>
    )
  }

  // Show "Waiting for F1 Session..." when no session is active yet (live mode only).
  if (!demoMode && sessionActive === false && !trackReady) {
    return (
      <div className="f1-session-view">
        <FillLoading text="Waiting for F1 Session..." />
      </div>
    )
  }

  return (
    <div className="f1-session-view">
      {/* Full-page spinner while session data is loading */}
      {!trackReady && <FillLoading />}

      <div className="f1-session-content" style={!trackReady ? { display: "none" } : undefined}>
        {weather && (
          <div className="f1-session-weather-bar">
            <div className="f1-session-guages">
              <TempGauge temperature={weather.trackTemperature} label="TRC" />
              <TempGauge temperature={weather.airTemperature} label="AIR" />
              <TempGauge temperature={weather.humidity} label="HUM" min={0} max={100} />
              <TempGauge temperature={weather.windSpeed} label="WND" min={0} max={40} />
            </div>
            <div className={`f1-session-icon-container ${weather.rainfall ? "rain" : "sun"}`}>
              {weather.rainfall ? <CloudRain/> : <Sun/>}
            </div>
          </div>
        )}
        {/* Top bar above track map that has title in the middle and SC/MC indicator */}
        <div className="f1-session-bar-top">
          {/* Safety Car takes priority over Medical Car — only one pill shown at a time */}
          {safetyCar
            ? <span className="safety-vehicle-pill safety-vehicle-pill--sc">SC</span>
            : medicalCar
              ? <span className="safety-vehicle-pill safety-vehicle-pill--mc">MC</span>
              : null}
          {/* Session title — shows "Track - Session" or "End of Demo" when replay finishes */}
          <p className={`f1-session-title${demoEnded ? ' f1-session-title--ended' : ''}`}>
            {demoEnded
              ? "End of Demo"
              : sessionInfo
                ? `${sessionInfo.trackName} - ${sessionInfo.sessionName}`
                : (sessionLabel || (demoMode ? "F1 Demo Session" : "F1 Live Session"))}
          </p>
        </div>
        {/* Live track map with car positions */}
        <div className="trackmap-container">
          <Trackmap
            selectedDriverNumber={driverView?.driverNumber ?? null}
            onDriverSelect={handleMapDriverSelect}
            onDriverStatesUpdate={handleDriverStatesUpdate}
            demoMode={demoMode}
            onTrackReady={handleTrackReady}
            onSessionInfo={setSessionInfo}
            onSessionActiveChange={handleSessionActiveChange}
            rotationDelta={dragRotationDelta}
            onRotationSave={handleRotationSave}
            trackFlag={trackFlag}
            onPillSegments={handlePillSegments}
            onWeatherUpdate={handleWeatherUpdate}
            onRaceControlUpdate={handleRaceControlUpdate}
          />
          <div className="trackmap-bar-bottom">
            <div
              className={`rc-toggle${showRaceControl ? " rc-toggle--active" : ""}`}
              onClick={() => setShowRaceControl((prev) => !prev)}
            >
              <Flag size={16} />
            </div>
            {user.permissions.admin && <Loop onMouseDown={handleRotationDragStart} />}
          </div>
        </div>

        {/* Toggle between driver list and race control messages panel */}
        {showRaceControl ? (
          <div className="race-control-messages">
            {sortedRaceControl.map((msg, i) => (
              <div key={i} className="rc-message">
                <span className="rc-message__time">
                  {new Date(msg.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                {msg.flag && <span className={`rc-message__flag rc-message__flag--${msg.flag.toLowerCase()}`} />}
                <span className="rc-message__text">{msg.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="driver-list" ref={listRef}>
            {sortedStates.map((state) => {
              const champDriver = champDriverMap.get(state.nameAcronym)
              return (
                <F1DriverCard
                  key={state.driverNumber}
                  state={state}
                  champDriver={champDriver}
                  selected={driverView?.driverNumber === state.driverNumber}
                  onClick={() => handleDriverViewSelect(state.driverNumber)}
                  pillSegments={pillSegments.get(state.driverNumber)}
                />
              )
            })}
          </div>
        )}

        {advButton && (
          <Button
            variant="contained"
            className="advance-button"
            color="primary"
            onClick={onAdvance}
          >
            Show Results
          </Button>
        )}
      </div>
    </div>
  )
}

export default F1SessionView
