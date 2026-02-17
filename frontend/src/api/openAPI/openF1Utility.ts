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

// Formats a lap time in seconds to "M:SS.mmm" display format (e.g. 96.767 → "1:36.767").
export const formatLapTime = (seconds: number | null): string | null => {
  if (seconds === null || seconds === undefined) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds - mins * 60
  const whole = Math.floor(secs)
  const ms = Math.round((secs - whole) * 1000)
  return `${mins}:${whole.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
}

// Formats a sector time in seconds to "SS.mmm" display format (e.g. 36.767 → "36.767").
export const formatSectorTime = (seconds: number | null): string | null => {
  if (seconds === null || seconds === undefined) return null
  const whole = Math.floor(seconds)
  const ms = Math.round((seconds - whole) * 1000)
  return `${whole}.${ms.toString().padStart(3, "0")}`
}

// Maps a TimingColor classification to its CSS color value.
export const timingColorValue = (color: string): string | undefined => {
  switch (color) {
    case "purple": return "#8E24AA"
    case "green": return "#43A047"
    default: return undefined
  }
}