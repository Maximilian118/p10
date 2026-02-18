import React, { useState, useCallback, useMemo, useContext, useRef, useEffect, useLayoutEffect } from "react"
import "./_f1SessionView.scss"
import Button from "@mui/material/Button"
import Trackmap from "../../../../../../api/openAPI/components/Trackmap/Trackmap"
import { DriverLiveState, SessionLiveState } from "../../../../../../api/openAPI/types"
import { AcceptedSegments } from "../../../../../../api/openAPI/openF1Utility"
import { RoundType, driverType } from "../../../../../../shared/types"
import F1DriverCard from "./F1DriverCard/F1DriverCard"
import TempGauge from "./TempGauge/TempGauge"
import FillLoading from "../../../../../../components/utility/fillLoading/FillLoading"
import { Loop, Thunderstorm } from "@mui/icons-material"
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
}) => {
  const { user, setUser } = useContext(AppContext)
  const [driverView, setDriverView] = useState<DriverLiveState | null>(null)
  const [trackReady, setTrackReady] = useState(false)
  const [driverStates, setDriverStates] = useState<DriverLiveState[]>([])
  const [sessionInfo, setSessionInfo] = useState<{ trackName: string; sessionName: string } | null>(null)
  // Accepted pill segments for all drivers (computed by Trackmap using visual car position).
  const [pillSegments, setPillSegments] = useState<Map<number, AcceptedSegments>>(new Map())
  // Weather data forwarded from the Trackmap's useTrackmap hook.
  const [weather, setWeather] = useState<SessionLiveState["weather"]>(null)

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

  return (
    <div className="f1-session-view">
      {/* Full-page spinner while session data is loading */}
      {!trackReady && <FillLoading />}

      {/* Main content — hidden while loading but Trackmap stays mounted
          so its useTrackmap hook keeps the data pipeline active. */}
      <div className="f1-session-content" style={!trackReady ? { display: "none" } : undefined}>
        <div className="f1-session-top-bar">
          {/* Temp stats */}
          {weather && (
            <div className="f1-session-temps">
              <TempGauge temperature={weather.trackTemperature} label="TRC" />
              <TempGauge temperature={weather.airTemperature} label="AIR" />
            </div>
          )}
          {/* Session title — shows "Track - Session" or "End of Demo" when replay finishes */}
          <p className={`f1-session-title${demoEnded ? ' f1-session-title--ended' : ''}`}>
            {demoEnded
              ? "End of Demo"
              : sessionInfo
                ? `${sessionInfo.trackName} - ${sessionInfo.sessionName}`
                : (sessionLabel || (demoMode ? "F1 Demo Session" : "F1 Live Session"))}
          </p>
          {/* Weather stats */}
          <div className="f1-session-weather">
            <Thunderstorm/>
          </div>
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
            rotationDelta={dragRotationDelta}
            onRotationSave={handleRotationSave}
            trackFlag={trackFlag}
            onPillSegments={handlePillSegments}
            onWeatherUpdate={handleWeatherUpdate}
          />
          <div className="trackmap-bar-bottom">
            {user.permissions.admin && <Loop onMouseDown={handleRotationDragStart} />}
          </div>
        </div>

        {/* A list of all drivers in the session with their current stats */}
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
