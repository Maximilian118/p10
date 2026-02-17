import React, { useRef } from "react"
import { segmentColor } from "../../../../../../../../api/openAPI/openF1Utility"
import "./_miniSectors.scss"

interface MiniSectorsProps {
  segments: {
    sector1: number[]
    sector2: number[]
    sector3: number[]
  }
  currentLapNumber: number
}

// Displays a row of colored pills representing mini-sector status across all three sectors.
// Uses a write-once buffer: once a pill gains color for a lap, it stays until the lap resets
// at the S/F line. This prevents flickering from momentary GPS recalculations.
const MiniSectors: React.FC<MiniSectorsProps> = ({ segments, currentLapNumber }) => {
  const allSegments = [...segments.sector1, ...segments.sector2, ...segments.sector3]

  // Write-once buffer — stamps are locked in per lap and reset on S/F crossing.
  const bufferRef = useRef<{ lap: number; values: (number | null)[] }>({ lap: -1, values: [] })

  // Reset buffer when the lap changes.
  if (bufferRef.current.lap !== currentLapNumber) {
    bufferRef.current = { lap: currentLapNumber, values: new Array(allSegments.length).fill(null) }
  }

  // Resize buffer if segment count changes mid-lap (preserving existing stamps).
  const buf = bufferRef.current.values
  if (buf.length !== allSegments.length) {
    bufferRef.current.values = allSegments.map((_, i) => (i < buf.length ? buf[i] : null))
  }

  // Stamp new non-zero values into the buffer (write-once: null → value, never back).
  allSegments.forEach((value, i) => {
    if (value !== 0 && bufferRef.current.values[i] === null) {
      bufferRef.current.values[i] = value
    }
  })

  return (
    <div className="mini-sectors">
      {allSegments.map((_, i) => {
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
