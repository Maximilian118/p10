import axios from "axios"
import { createLogger } from "../../shared/logger"

const mvLog = createLogger("MultiViewer")

const MULTIVIEWER_API_BASE = "https://api.multiviewer.app/api/v1"

// ─── Types ───────────────────────────────────────────────────────

// Track outline and metadata returned by the MultiViewer circuit API.
export interface MultiViewerTrackData {
  path: { x: number; y: number }[]
  rotation: number
  corners: { number: number; trackPosition: { x: number; y: number } }[]
  marshalSectors: { trackPosition: { x: number; y: number } }[]
}

// Raw track detail response from the API.
interface MultiViewerTrackResponse {
  circuitKey: number
  circuitName: string
  x: number[]
  y: number[]
  rotation: number
  corners: { number: number; trackPosition: { x: number; y: number } }[]
  marshalSectors: { trackPosition: { x: number; y: number } }[]
}

// ─── Public API ──────────────────────────────────────────────────

// Fetches the full track outline for a circuit/year from MultiViewer.
// Uses the numeric circuitKey shared by both OpenF1 and MultiViewer APIs.
// Returns the path, rotation, corners, and marshal sectors, or null on failure.
export const fetchTrackOutline = async (
  circuitKey: number,
  year: number,
): Promise<MultiViewerTrackData | null> => {
  try {
    const res = await axios.get<MultiViewerTrackResponse>(
      `${MULTIVIEWER_API_BASE}/circuits/${circuitKey}/${year}`,
      { timeout: 5000 },
    )

    const data = res.data
    if (!data.x || !data.y || data.x.length === 0) return null

    // Convert parallel x/y arrays to an array of {x, y} points.
    // Negate Y to convert from MultiViewer's math coordinates (Y-up) to SVG (Y-down).
    const path = data.x.map((x, i) => ({ x, y: data.y[i] }))

    return {
      path,
      rotation: data.rotation,
      corners: data.corners || [],
      marshalSectors: data.marshalSectors || [],
    }
  } catch (err) {
    mvLog.error(`⚠ Failed to fetch track outline for circuit ${circuitKey}:`, err)
    return null
  }
}
