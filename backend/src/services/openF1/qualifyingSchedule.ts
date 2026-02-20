import { Server } from "socket.io"
import axios from "axios"
import moment from "moment"
import Champ from "../../models/champ"
import Series from "../../models/series"
import { getOpenF1Token } from "./auth"
import { SOCKET_EVENTS } from "../../socket/socketHandler"
import { createLogger } from "../../shared/logger"

const log = createLogger("QualifyingSchedule")

const OPENF1_API_BASE = "https://api.openf1.org/v1"

// How often to poll for the next qualifying session (1 hour in ms).
const POLL_INTERVAL = 60 * 60 * 1000

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
  year: number
}

// Fetches the next upcoming qualifying session from the OpenF1 API.
// Uses session_name=Qualifying to exclude Sprint Qualifying sessions.
// Filters client-side for sessions starting after now (the API does not support
// comparison operators on date_start).
const fetchNextQualifyingSession = async (): Promise<OpenF1SessionSchedule | null> => {
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

    // Find the earliest qualifying session starting after now.
    const upcoming = (res.data || [])
      .filter((s) => new Date(s.date_start).getTime() > Date.now())
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())

    if (upcoming.length === 0) {
      log.info("No upcoming qualifying sessions found")
      return null
    }

    const next = upcoming[0]
    log.info(`Next qualifying: "${next.session_name}" at ${next.date_start}`)
    return next
  } catch (err) {
    log.error("Failed to fetch qualifying schedule:", err)
    return null
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

// Polls for the next qualifying session and updates championship timestamps.
export const pollNextQualifyingSession = async (): Promise<void> => {
  log.info("Polling for next qualifying session...")
  const nextSession = await fetchNextQualifyingSession()
  if (nextSession) {
    await updateChampionshipTimestamps(nextSession)
  }
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
    const nextSession = await fetchNextQualifyingSession()
    if (!nextSession) return

    const champ = await Champ.findById(champId)
    if (!champ || !champ.settings.automation.enabled || !champ.settings.automation.bettingWindow.autoOpen) return

    champ.settings.automation.bettingWindow.autoOpenData = {
      timestamp: nextSession.date_start,
      updated_at: moment().format(),
    }
    champ.markModified("settings")
    await champ.save()
    log.info(`Refreshed next qualifying for "${champ.name}" — ${nextSession.date_start}`)

    // Broadcast to connected clients so RoundsBar countdown updates without refresh.
    ioServer?.to(`championship:${champId}`).emit(SOCKET_EVENTS.SCHEDULE_UPDATED, {
      champId,
      autoOpenTimestamp: nextSession.date_start,
    })
  } catch (err) {
    log.error(`Failed to refresh qualifying for champ ${champId}:`, err)
  }
}
