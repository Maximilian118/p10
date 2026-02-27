// Returns an ordinal position label (1st, 2nd, 3rd, 4th...).
export const positionLabel = (pos: number): string => {
  if (pos === 1) return "1st"
  if (pos === 2) return "2nd"
  if (pos === 3) return "3rd"
  return `${pos}th`
}

// Computes the effective average after applying the 5% missed-round penalty.
export const effectiveAvg = (cumulativeAverage: number, missedRounds: number): number => {
  return Math.max(0, cumulativeAverage - (missedRounds || 0) * 5)
}
