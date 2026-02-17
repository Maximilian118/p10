// Maps a mini-sector status value to its display color.
export const segmentColor = (value: number): string | null => {
  switch (value) {
    case 2048: return "#FDD835"  // yellow sector
    case 2049: return "#43A047"  // green sector
    case 2051: return "#8E24AA"  // purple sector
    case 2064: return "#757575"  // pitlane
    default: return null         // no overlay
  }
}

// Write-once buffer holding accepted segment values for the current visual lap.
// Each slot is null until the driver passes it, then stamped with the color value.
export interface AcceptedSegments {
  sector1: (number | null)[]
  sector2: (number | null)[]
  sector3: (number | null)[]
}

// Computes forward distance from a base progress to a target on the circular 0-1 track.
export const forwardDistance = (base: number, target: number): number => {
  const d = target - base
  return d >= 0 ? d : d + 1.0
}