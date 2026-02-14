import React, { CSSProperties } from "react"
import "./_tyreCompound.scss"
import {
  resolveCompound,
  getCompoundColour,
  getCompoundLetter,
  type CompoundAllocation
} from "./tyreCompoundUtility"

interface TyreCompoundProps {
  // Accepts a label string ("soft", "MEDIUM", etc.) or base compound number (1-5)
  compound: string | number | null | undefined
  // Optional weekend allocation to resolve C1-C5 numbers to labels
  allocation?: CompoundAllocation
  style?: CSSProperties
}

// Displays a Pirelli-style tyre compound indicator with coloured side bands
// mimicking the sidewall markings on real F1 tyres.
const TyreCompound: React.FC<TyreCompoundProps> = ({ compound, allocation, style }) => {
  // Resolve compound or fall back to unknown (gray "?")
  const resolved = (compound !== null && compound !== undefined)
    ? resolveCompound(compound, allocation)
    : null

  const colour = resolved ? getCompoundColour(resolved) : "#888888"
  const letter = resolved ? getCompoundLetter(resolved) : "?"

  return (
    <div
      className="tyre-compound"
      style={{ ...style, "--compound-color": colour } as React.CSSProperties}
    >
      <svg className="tyre-compound__ring" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" />
      </svg>
      <span className="tyre-compound__letter">{letter}</span>
    </div>
  )
}

export default TyreCompound
