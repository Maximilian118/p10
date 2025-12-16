/**
 * Converts a hex color string to RGB values.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '')
  return {
    r: parseInt(sanitized.slice(0, 2), 16),
    g: parseInt(sanitized.slice(2, 4), 16),
    b: parseInt(sanitized.slice(4, 6), 16),
  }
}

/**
 * Calculates relative luminance per WCAG 2.0 guidelines.
 * Uses sRGB to linear RGB conversion before applying luminance coefficients.
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const normalized = c / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Determines whether black or white text provides better contrast
 * against a given background color.
 */
export function getContrastTextColor(hexColor: string): 'black' | 'white' {
  const { r, g, b } = hexToRgb(hexColor)
  const luminance = getRelativeLuminance(r, g, b)
  return luminance > 0.179 ? 'black' : 'white'
}
