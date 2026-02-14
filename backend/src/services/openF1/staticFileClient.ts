import axios from "axios"
import { createLogger } from "../../shared/logger"

const log = createLogger("StaticFiles")

const STATIC_BASE = "https://livetiming.formula1.com/static"

// Topics available from F1 static files (free for historical sessions).
const STATIC_TOPICS = [
  "TimingData",
  "TimingAppData",
  "TimingStats",
  "DriverList",
  "SessionInfo",
  "SessionStatus",
  "TrackStatus",
  "RaceControlMessages",
  "WeatherData",
  "LapCount",
  "TeamRadio",
  "SessionData",
  "ExtrapolatedClock",
  "Position.z",
  "CarData.z",
]

// A single entry from a static file: [timestamp_string, data_object].
type StaticFileEntry = [string, Record<string, unknown>]

// Parsed message from static files, ready for replay.
export interface StaticMessage {
  topic: string
  data: Record<string, unknown>
  timestamp: number
}

// Fetches a single static file topic for a session path.
// Returns null if the file is unavailable (404).
const fetchStaticTopic = async (
  sessionPath: string,
  topic: string,
): Promise<StaticFileEntry[] | null> => {
  try {
    const url = `${STATIC_BASE}/${sessionPath}/${topic}.jsonl`
    const res = await axios.get(url, {
      responseType: "text",
      timeout: 30000,
      headers: { "User-Agent": "BestHTTP" },
    })

    if (!res.data || typeof res.data !== "string") return null

    // Static files use JSONL format: each line is a JSON array [timestamp, data].
    const entries: StaticFileEntry[] = []
    const lines = res.data.split("\n").filter((l: string) => l.trim())

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (Array.isArray(parsed) && parsed.length >= 2) {
          entries.push(parsed as StaticFileEntry)
        }
      } catch {
        // Skip malformed lines.
      }
    }

    return entries.length > 0 ? entries : null
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null
    }
    log.verbose(`Failed to fetch ${topic}: ${(err as Error).message}`)
    return null
  }
}

// Fetches the session index to discover available sessions and their paths.
// The index is at: https://livetiming.formula1.com/static/{year}/Index.json
export const fetchSessionIndex = async (year: number): Promise<{ path: string; name: string }[] | null> => {
  try {
    const url = `${STATIC_BASE}/${year}/Index.json`
    const res = await axios.get(url, {
      timeout: 30000,
      headers: { "User-Agent": "BestHTTP" },
    })

    if (!res.data || !res.data.Meetings) return null

    const sessions: { path: string; name: string }[] = []

    // Walk meetings → sessions to extract paths.
    for (const meeting of res.data.Meetings) {
      if (!meeting.Sessions) continue
      for (const session of meeting.Sessions) {
        if (session.Path) {
          sessions.push({
            path: session.Path,
            name: `${meeting.Name} - ${session.Name}`,
          })
        }
      }
    }

    return sessions
  } catch (err) {
    log.warn(`Failed to fetch session index for ${year}: ${(err as Error).message}`)
    return null
  }
}

// Fetches all available static file data for a given session path.
// Returns parsed messages sorted chronologically, or null if the session isn't available.
export const fetchStaticSession = async (
  sessionPath: string,
): Promise<StaticMessage[] | null> => {
  log.info(`Fetching static files from: ${sessionPath}`)

  // Fetch all available topics in parallel.
  const results = await Promise.all(
    STATIC_TOPICS.map(async (topic) => {
      const entries = await fetchStaticTopic(sessionPath, topic)
      return { topic, entries }
    }),
  )

  // Count how many topics have data.
  const available = results.filter((r) => r.entries !== null)
  if (available.length === 0) {
    log.info("No static file data available for this session")
    return null
  }

  log.info(`Fetched ${available.length}/${STATIC_TOPICS.length} topics from static files`)

  // Convert all entries to a flat message list.
  const messages: StaticMessage[] = []

  for (const { topic, entries } of available) {
    if (!entries) continue

    for (const [timestampStr, data] of entries) {
      // Parse the timestamp string (ISO 8601 format).
      const timestamp = new Date(timestampStr).getTime()
      if (isNaN(timestamp)) continue

      messages.push({ topic, data, timestamp })
    }
  }

  // Sort chronologically.
  messages.sort((a, b) => a.timestamp - b.timestamp)

  log.info(`${messages.length} total messages from static files`)
  return messages
}

// ─── Session Path Resolution ────────────────────────────────────

// A session from the static file index with enriched metadata.
interface IndexSession {
  name: string
  path: string
  startDate: number
  sessionType: string
}

// Fetches the full session index with start dates for matching.
const fetchFullIndex = async (year: number): Promise<IndexSession[] | null> => {
  try {
    const url = `${STATIC_BASE}/${year}/Index.json`
    const res = await axios.get(url, {
      timeout: 30000,
      headers: { "User-Agent": "BestHTTP" },
    })

    if (!res.data?.Meetings) return null

    const sessions: IndexSession[] = []

    // Walk meetings → sessions, extracting paths and dates.
    for (const meeting of res.data.Meetings) {
      if (!meeting.Sessions) continue
      for (const session of meeting.Sessions) {
        if (!session.Path) continue
        sessions.push({
          name: `${meeting.Name} - ${session.Name}`,
          path: session.Path,
          startDate: session.StartDate ? new Date(session.StartDate).getTime() : 0,
          sessionType: normalizeSessionType(session.Name ?? ""),
        })
      }
    }

    return sessions
  } catch {
    return null
  }
}

// Normalizes session type strings for matching (e.g., "Race", "Qualifying").
const normalizeSessionType = (name: string): string => {
  const lower = name.toLowerCase()
  if (lower.includes("sprint") && lower.includes("qualifying")) return "sprint_qualifying"
  if (lower.includes("sprint") && lower.includes("shootout")) return "sprint_qualifying"
  if (lower.includes("sprint")) return "sprint"
  if (lower.includes("race")) return "race"
  if (lower.includes("qualifying")) return "qualifying"
  if (lower.includes("practice 1") || lower.includes("fp1")) return "fp1"
  if (lower.includes("practice 2") || lower.includes("fp2")) return "fp2"
  if (lower.includes("practice 3") || lower.includes("fp3")) return "fp3"
  if (lower.includes("practice")) return "practice"
  return lower
}

// Resolves an OpenF1 session key to a static file path by fetching
// session metadata from OpenF1 and matching against the static file index.
// Uses date proximity + session type for heuristic matching.
export const resolveSessionPath = async (
  sessionKey: number,
  year: number,
  sessionDate?: string,
  sessionName?: string,
): Promise<string | null> => {
  if (!sessionDate || !sessionName) {
    log.verbose(`No session metadata provided for key ${sessionKey} — cannot resolve static path`)
    return null
  }

  // Fetch the static file index for the year.
  const index = await fetchFullIndex(year)
  if (!index || index.length === 0) return null

  log.verbose(`Static file index has ${index.length} sessions for ${year}`)

  // Match by date proximity and session type.
  const targetDate = new Date(sessionDate).getTime()
  const targetType = normalizeSessionType(sessionName)

  let bestMatch: string | null = null
  let bestDelta = Infinity

  for (const session of index) {
    // Session type must match.
    if (session.sessionType !== targetType) continue

    // Date must be within 2 days (to handle timezone differences).
    const delta = Math.abs(session.startDate - targetDate)
    if (delta < 2 * 24 * 60 * 60 * 1000 && delta < bestDelta) {
      bestDelta = delta
      bestMatch = session.path
    }
  }

  if (bestMatch) {
    log.info(`Resolved session ${sessionKey} → static path: ${bestMatch}`)
  } else {
    log.verbose(`No static file match for session ${sessionKey} (${sessionName} @ ${sessionDate})`)
  }

  return bestMatch
}
