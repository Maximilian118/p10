import { Server } from "socket.io"
import axios from "axios"
import moment from "moment"
import Champ from "../../models/champ"
import Series from "../../models/series"
import { getOpenF1Token } from "./auth"
import { SOCKET_EVENTS } from "../../socket/socketHandler"
import { detectAndHandleMissedRounds } from "./missedRoundHandler"
import { archiveLeagueSeason } from "../../shared/leagueScoring"
import League from "../../models/league"
import { createLogger } from "../../shared/logger"

const log = createLogger("QualifyingSchedule")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// How often to poll for the qualifying schedule (1 hour in ms).
const POLL_INTERVAL = 60 * 60 * 1000

// 1-hour buffer (ms) after a session ends before counting it as "completed" for league purposes.
const COMPLETION_BUFFER_MS = 60 * 60 * 1000

// Official F1 calendar API (Ergast/Jolpica) — free, no auth required.
const OFFICIAL_CALENDAR_API = "https://api.jolpi.ca/ergast/f1"

// How long to cache the official calendar (24 hours — calendar changes rarely).
const CALENDAR_CACHE_TTL = 24 * 60 * 60 * 1000

// Maximum day difference between a qualifying session and its race day to be considered the same weekend.
const RACE_WEEKEND_WINDOW_DAYS = 2

// In-memory cache for official calendar race dates.
let cachedRaceDates: Set<string> | null = null
let raceDatesExpiresAt = 0

let pollTimer: NodeJS.Timeout | null = null
let ioServer: Server | null = null

// OpenF1 session response shape (subset of fields we need).
interface OpenF1SessionSchedule {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  meeting_key: number
  circuit_short_name: string
  year: number
}

// Full qualifying schedule analysis result.
interface QualifyingScheduleResult {
  completedCount: number // Sessions where date_end + 1h buffer < now.
  totalSessions: number // Total qualifying sessions for the year.
  nextSession: OpenF1SessionSchedule | null // Next upcoming session.
  allSessionsFinished: boolean // All sessions ended (with 1h buffer).
}

// Fetches official race dates from the Ergast/Jolpica API for the given year.
// Returns a Set of race-day date strings (YYYY-MM-DD), or null on failure.
// Cached for 24 hours since the calendar changes very infrequently.
const fetchOfficialRaceDates = async (year: number): Promise<Set<string> | null> => {
  const now = Date.now()
  if (cachedRaceDates && now < raceDatesExpiresAt) return cachedRaceDates

  try {
    const res = await axios.get(`${OFFICIAL_CALENDAR_API}/${year}.json`, { timeout: 10000 })
    const races = res.data?.MRData?.RaceTable?.Races || []
    const dates = new Set<string>(races.map((r: { date: string }) => r.date))
    cachedRaceDates = dates
    raceDatesExpiresAt = now + CALENDAR_CACHE_TTL
    log.info(`Official calendar: ${dates.size} races for ${year}`)
    return dates
  } catch (err) {
    log.warn("Failed to fetch official calendar — using unfiltered OpenF1 data:", err)
    return null
  }
}

// Filters out cancelled sessions by cross-referencing against the official F1 calendar.
// A qualifying session is valid if its date falls within ±2 days of any official race date.
const filterCancelledSessions = (
  sessions: OpenF1SessionSchedule[],
  officialRaceDates: Set<string>,
): OpenF1SessionSchedule[] => {
  const windowMs = RACE_WEEKEND_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return sessions.filter((session) => {
    const qualTime = new Date(session.date_start).getTime()
    for (const raceDateStr of officialRaceDates) {
      const raceTime = new Date(raceDateStr + "T00:00:00Z").getTime()
      if (Math.abs(qualTime - raceTime) <= windowMs) return true
    }
    log.info(`Filtered cancelled session: ${session.circuit_short_name} (${session.date_start})`)
    return false
  })
}

// Fetches all qualifying sessions for the year and computes schedule analysis.
// Returns completed count (with 1h buffer), next upcoming session, and finalization status.
const fetchQualifyingSchedule = async (): Promise<QualifyingScheduleResult | null> => {
  try {
    const token = await getOpenF1Token()
    if (!token) {
      log.warn("No OpenF1 token available — cannot fetch qualifying schedule")
      return null
    }

    const res = await axios.get<OpenF1SessionSchedule[]>(
      `${OPENF1_API_BASE}/sessions`,
      {
        params: {
          year: new Date().getFullYear(),
          session_name: "Qualifying",
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      },
    )

    const rawSessions = res.data || []

    // Cross-check against the official F1 calendar to filter out cancelled sessions.
    const officialDates = await fetchOfficialRaceDates(new Date().getFullYear())
    const allSessions = officialDates
      ? filterCancelledSessions(rawSessions, officialDates)
      : rawSessions

    const now = Date.now()

    // Count sessions that ended more than 1h ago (buffer for champs to finish processing).
    const completedCount = allSessions.filter(
      (s) => new Date(s.date_end).getTime() + COMPLETION_BUFFER_MS < now,
    ).length

    // Find the earliest qualifying session starting after now.
    const upcoming = allSessions
      .filter((s) => new Date(s.date_start).getTime() > now)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())

    const nextSession = upcoming[0] || null

    // All sessions are finished (with buffer) when completed count equals total.
    const allSessionsFinished = allSessions.length > 0 && completedCount === allSessions.length

    if (nextSession) {
      log.info(`Schedule: ${completedCount}/${allSessions.length} completed, next at ${nextSession.date_start}`)
    } else {
      log.info(`Schedule: ${completedCount}/${allSessions.length} completed, no upcoming sessions`)
    }

    return { completedCount, totalSessions: allSessions.length, nextSession, allSessionsFinished }
  } catch (err) {
    log.error("Failed to fetch qualifying schedule:", err)
    return null
  }
}

// Updates completedRounds on all API-enabled series.
const updateSeriesCompletedRounds = async (completedCount: number): Promise<void> => {
  try {
    await Series.updateMany(
      { hasAPI: true },
      { $set: { completedRounds: completedCount, updated_at: moment().format() } },
    )
    log.info(`Updated completedRounds to ${completedCount} on all API-enabled series`)
  } catch (err) {
    log.error("Failed to update series completedRounds:", err)
  }
}

// Finalizes all API-series leagues whose season is complete.
const finalizeAPILeagues = async (): Promise<void> => {
  try {
    const apiSeries = await Series.find({ hasAPI: true })
    for (const series of apiSeries) {
      // Find leagues that haven't been finalized this season (seasonEndedAt is null).
      const leagues = await League.find({ series: series._id, seasonEndedAt: null })
      for (const league of leagues) {
        log.info(`Finalizing API league "${league.name}" — all qualifying sessions complete`)
        await archiveLeagueSeason(league._id.toString())
      }
    }
  } catch (err) {
    log.error("Failed to finalize API leagues:", err)
  }
}

// Finalizes non-API leagues whose season year has passed.
const finalizeNonAPILeagues = async (): Promise<void> => {
  try {
    const currentYear = new Date().getFullYear()
    // Find all leagues that haven't ended their current season.
    const leagues = await League.find({ seasonEndedAt: null })
    for (const league of leagues) {
      const series = await Series.findById(league.series)
      if (series?.hasAPI) continue // API leagues handled separately.
      // Finalize if the league's season year is behind the current year.
      if (league.season < currentYear) {
        log.info(`Finalizing non-API league "${league.name}" — year ${league.season} ended`)
        await archiveLeagueSeason(league._id.toString())
      }
    }
  } catch (err) {
    log.error("Failed to finalize non-API leagues:", err)
  }
}

// Updates the autoOpenData timestamp on all active championships with automation enabled.
const updateChampionshipTimestamps = async (nextSession: OpenF1SessionSchedule): Promise<void> => {
  try {
    // Find all API-enabled series.
    const apiSeries = await Series.find({ hasAPI: true })
    if (apiSeries.length === 0) return

    const apiSeriesIds = apiSeries.map((s) => s._id)

    // Find active championships with automation enabled.
    const champs = await Champ.find({
      active: true,
      series: { $in: apiSeriesIds },
      "settings.automation.enabled": true,
      "settings.automation.bettingWindow.autoOpen": true,
    })

    const now = moment().format()

    for (const champ of champs) {
      const currentTimestamp = champ.settings.automation.bettingWindow.autoOpenData?.timestamp
      const newTimestamp = nextSession.date_start

      // Only update if the timestamp has changed.
      if (currentTimestamp !== newTimestamp) {
        champ.settings.automation.bettingWindow.autoOpenData = {
          timestamp: newTimestamp,
          updated_at: now,
        }
        champ.markModified("settings")
        await champ.save()
        log.info(`Updated "${champ.name}" — next qualifying at ${newTimestamp}`)

        // Broadcast to connected clients so RoundsBar countdown updates without refresh.
        const champId = champ._id.toString()
        ioServer?.to(`championship:${champId}`).emit(SOCKET_EVENTS.SCHEDULE_UPDATED, {
          champId,
          autoOpenTimestamp: newTimestamp,
        })
      }
    }
  } catch (err) {
    log.error("Failed to update championship timestamps:", err)
  }
}

// Polls for qualifying schedule, updates series completedRounds, championship timestamps,
// detects missed rounds, and triggers finalization when seasons are complete.
export const pollNextQualifyingSession = async (): Promise<void> => {
  log.info("Polling qualifying schedule...")

  const result = await fetchQualifyingSchedule()
  if (!result) return

  // Update series.completedRounds from qualifying schedule.
  await updateSeriesCompletedRounds(result.completedCount)

  // Update championship auto-open timestamps with the next qualifying session.
  if (result.nextSession) {
    await updateChampionshipTimestamps(result.nextSession)
  }

  // Detect and handle missed rounds for league-enrolled championships.
  if (result.completedCount > 0) {
    await detectAndHandleMissedRounds(result.completedCount, ioServer)
  }

  // Finalize API leagues when all qualifying sessions are complete.
  if (result.allSessionsFinished) {
    await finalizeAPILeagues()
  }

  // Finalize non-API leagues when the calendar year has changed.
  await finalizeNonAPILeagues()
}

// Starts the hourly polling loop for qualifying session schedule.
export const startQualifyingSchedulePolling = (io: Server): void => {
  if (pollTimer) return
  ioServer = io

  // Run immediately on startup.
  pollNextQualifyingSession()

  // Then poll every hour.
  pollTimer = setInterval(pollNextQualifyingSession, POLL_INTERVAL)
  log.info(`✓ Qualifying schedule polling started (every ${POLL_INTERVAL / 60000} min)`)
}

// Stops the polling loop.
export const stopQualifyingSchedulePolling = (): void => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
    log.info("Qualifying schedule polling stopped")
  }
}

// Refreshes the next qualifying timestamp for a specific championship.
// Called after a round completes to update the schedule for the next round.
export const refreshNextQualifyingForChamp = async (champId: string): Promise<void> => {
  try {
    const result = await fetchQualifyingSchedule()
    if (!result?.nextSession) return

    const champ = await Champ.findById(champId)
    if (!champ || !champ.settings.automation.enabled || !champ.settings.automation.bettingWindow.autoOpen) return

    champ.settings.automation.bettingWindow.autoOpenData = {
      timestamp: result.nextSession.date_start,
      updated_at: moment().format(),
    }
    champ.markModified("settings")
    await champ.save()
    log.info(`Refreshed next qualifying for "${champ.name}" — ${result.nextSession.date_start}`)

    // Broadcast to connected clients so RoundsBar countdown updates without refresh.
    ioServer?.to(`championship:${champId}`).emit(SOCKET_EVENTS.SCHEDULE_UPDATED, {
      champId,
      autoOpenTimestamp: result.nextSession.date_start,
    })
  } catch (err) {
    log.error(`Failed to refresh qualifying for champ ${champId}:`, err)
  }
}
