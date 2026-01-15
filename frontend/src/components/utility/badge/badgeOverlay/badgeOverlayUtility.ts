export const getBadgeColour = (rarity: number, error?: boolean): string => {
  if (error) {
    return "#d32f2f" // Error
  }

  switch (rarity) {
    case 0:
      return "#9d9d9d" // Common
    case 1:
      return "#967969" // Uncommon
    case 2:
      return "#66bb6a" // Rare
    case 3:
      return "#3080d0" // Epic
    case 4:
      return "#DA70D6" // Legendary
    case 5:
      return "#FFC000" // Mythic
    default:
      return "#C0C0C0"
  }
}

// Converts hex color to rgba for opacity control
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Returns a box-shadow CSS value for the badge glow effect
// Glow intensity increases with rarity level (0 = minimal, 5 = maximum)
export const getBadgeGlow = (rarity: number, error?: boolean): string => {
  const color = getBadgeColour(rarity, error)

  const glowParams = {
    0: { blur: 2, spread: 0, opacity: 0.2 },   // Common - subtle glow
    1: { blur: 3, spread: 1, opacity: 0.3 },   // Uncommon
    2: { blur: 5, spread: 1, opacity: 0.4 },   // Rare
    3: { blur: 7, spread: 2, opacity: 0.5 },   // Epic
    4: { blur: 10, spread: 3, opacity: 0.6 },  // Legendary
    5: { blur: 14, spread: 4, opacity: 0.7 },  // Mythic - maximum glow
  }

  const params = glowParams[rarity as keyof typeof glowParams] || glowParams[0]

  const outerGlow = `0 0 ${params.blur}px ${params.spread}px ${hexToRgba(color, params.opacity)}`
  const innerGlow = `inset 0 0 ${Math.round(params.blur * 0.4)}px ${Math.round(params.spread * 0.3)}px ${hexToRgba(color, Math.min(params.opacity + 0.3, 1))}`

  return `${outerGlow}, ${innerGlow}`
}
