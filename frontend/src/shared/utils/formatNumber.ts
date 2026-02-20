// Format a number into a compact, human-readable string (e.g. 1500 → "1.5k").
export const formatCompactNumber = (num: number): string => {
  if (num < 1000) return num.toString()
  if (num < 1000000) {
    const k = num / 1000
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
  }
  const m = num / 1000000
  return m % 1 === 0 ? `${m}m` : `${m.toFixed(1)}m`
}
