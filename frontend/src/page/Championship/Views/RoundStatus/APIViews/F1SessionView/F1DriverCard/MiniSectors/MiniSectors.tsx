import React, { useRef } from "react"
import { segmentColor, AcceptedSegments } from "../../../../../../../../api/openAPI/openF1Utility"
import "./_miniSectors.scss"

interface MiniSectorsProps {
  segments: {
    sector1: number[]
    sector2: number[]
    sector3: number[]
  }
  currentLapNumber: number
  acceptedSegments?: AcceptedSegments
}

// Displays a row of colored pills representing mini-sector status across all three sectors.
// Mini-sector counts vary by track and by sector (typically 5–12 per sector).
// Always renders one pill per mini-sector regardless of data availability.
//
// When acceptedSegments is provided (from Trackmap's visual car position gating),
// pills colour exactly when the car dot crosses each mini-sector line.
// Fallback: uses a write-once buffer for live mode where MQTT provides natural timing.
const MiniSectors: React.FC<MiniSectorsProps> = ({ segments, currentLapNumber, acceptedSegments }) => {
  // Write-once buffer for fallback mode (live sessions without acceptedSegments).
  const bufferRef = useRef<{ lap: number; values: (number | null)[] }>({ lap: -1, values: [] })

  // When acceptedSegments is provided, derive pill count from it — its arrays are sized
  // to the track's canonical segment counts (max across all drivers), so retired/DNF
  // drivers get the same number of pills as everyone else.
  if (acceptedSegments) {
    const accepted = [
      ...acceptedSegments.sector1,
      ...acceptedSegments.sector2,
      ...acceptedSegments.sector3,
    ]

    return (
      <div className="mini-sectors">
        {accepted.map((value, i) => {
          const color = value !== null ? (segmentColor(value) ?? "#E0E0E0") : "#E0E0E0"
          return (
            <div
              key={i}
              className="mini-sectors__pill"
              style={{ backgroundColor: color }}
            />
          )
        })}
      </div>
    )
  }

  // Fallback pill count — from the driver's own segment data (live MQTT mode).
  const totalPills = segments.sector1.length + segments.sector2.length + segments.sector3.length

  // Fallback: write-once buffer for live sessions (MQTT provides natural timing).
  const allSegments = [...segments.sector1, ...segments.sector2, ...segments.sector3]

  // Reset buffer when the lap changes.
  if (bufferRef.current.lap !== currentLapNumber) {
    bufferRef.current = { lap: currentLapNumber, values: new Array(totalPills).fill(null) }
  }

  // Resize buffer if segment count changes mid-lap (preserving existing stamps).
  const buf = bufferRef.current.values
  if (buf.length !== totalPills) {
    bufferRef.current.values = Array.from({ length: totalPills }, (_, i) => (i < buf.length ? buf[i] : null))
  }

  // Stamp new non-zero values into the buffer (write-once: null → value, never back).
  allSegments.forEach((value, i) => {
    if (value !== 0 && bufferRef.current.values[i] === null) {
      bufferRef.current.values[i] = value
    }
  })

  return (
    <div className="mini-sectors">
      {Array.from({ length: totalPills }, (_, i) => {
        const stamped = bufferRef.current.values[i]
        const color = stamped !== null ? (segmentColor(stamped) ?? "#E0E0E0") : "#E0E0E0"
        return (
          <div
            key={i}
            className="mini-sectors__pill"
            style={{ backgroundColor: color }}
          />
        )
      })}
    </div>
  )
}

export default MiniSectors
