import sharp from "sharp"
import { createLogger } from "./logger"

const log = createLogger("ColorExtraction")

// Default fallback color if extraction fails.
const DEFAULT_COLOR = "#1a1a2e"

/**
 * Extracts the exact dominant color from an image URL.
 * Uses sharp to count pixel colors and find the most common one.
 * Falls back to a default color if extraction fails.
 *
 * @param imageUrl - The S3 URL of the image to analyze
 * @returns Promise<string> - Hex color string (e.g., "#E10600")
 */
export const extractDominantColor = async (imageUrl: string): Promise<string> => {
  try {
    // Ensure HTTPS for the URL (S3 supports both).
    const secureUrl = imageUrl.replace(/^http:\/\//, "https://")

    // Fetch the image.
    const response = await fetch(secureUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Resize for performance, then get raw pixel data.
    const { data, info } = await sharp(inputBuffer)
      .resize(100, 100, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Count color occurrences.
    const colorCounts = new Map<string, number>()
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    // Find most common color.
    let maxCount = 0
    let dominantColor = DEFAULT_COLOR
    for (const [color, count] of colorCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantColor = color
      }
    }

    return dominantColor
  } catch (error) {
    log.error(`Color extraction failed for URL: ${imageUrl}`)
    log.error("Error:", error)
    return DEFAULT_COLOR
  }
}
