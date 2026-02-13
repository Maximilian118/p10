import mongoose from "mongoose"
import { SessionState } from "../services/openF1/types"
import { createLogger } from "../shared/logger"

const log = createLogger("F1Session")

// Lap summary for a single driver-lap within a session.
interface LapSummary {
  lapNumber: number
  lapDuration: number | null
  sectorTimes: { s1: number | null; s2: number | null; s3: number | null }
  segments: { sector1: number[]; sector2: number[]; sector3: number[] }
  isPitOutLap: boolean
  compound: string | null
}

// Stint summary for a driver within a session.
interface StintSummary {
  stintNumber: number
  compound: string
  lapStart: number
  lapEnd: number | null
  tyreAgeAtStart: number
}

// Pit stop record for a driver within a session.
interface PitStopSummary {
  count: number
  lastDuration: number | null
}

// Per-driver aggregated data for the session.
interface DriverSummary {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
  finalPosition: number | null
  bestLapTime: number | null
  laps: LapSummary[]
  stints: StintSummary[]
  pitStops: PitStopSummary
}

// Weather snapshot captured during the session.
interface WeatherSnapshot {
  date: string
  airTemp: number
  trackTemp: number
  humidity: number
  rainfall: boolean
}

// Race control event from the session.
interface RaceControlRecord {
  date: string
  category: string
  message: string
  flag: string | null
}

// Overtake event from the session.
interface OvertakeRecord {
  date: string
  overtakingDriver: number
  overtakenDriver: number
  position: number
}

// Full F1 session document stored in MongoDB.
export interface F1SessionType {
  sessionKey: number
  meetingKey: number
  trackName: string
  sessionType: string
  sessionName: string
  driverSummaries: DriverSummary[]
  weatherSnapshots: WeatherSnapshot[]
  raceControlEvents: RaceControlRecord[]
  overtakes: OvertakeRecord[]
  startedAt: Date
  endedAt: Date | null
  expiresAt: Date
}

// Schema for persisted F1 session data with 30-day TTL.
const f1SessionSchema = new mongoose.Schema<F1SessionType>({
  sessionKey: { type: Number, required: true, unique: true },
  meetingKey: { type: Number, required: true },
  trackName: { type: String, required: true },
  sessionType: { type: String, required: true },
  sessionName: { type: String, required: true },
  driverSummaries: { type: mongoose.Schema.Types.Mixed, default: [] },
  weatherSnapshots: { type: mongoose.Schema.Types.Mixed, default: [] },
  raceControlEvents: { type: mongoose.Schema.Types.Mixed, default: [] },
  overtakes: { type: mongoose.Schema.Types.Mixed, default: [] },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
})

// TTL index — MongoDB automatically deletes documents once expiresAt has passed.
f1SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const F1Session = mongoose.model<F1SessionType>("F1Session", f1SessionSchema)

// Builds and persists an F1Session document from the active session state.
export const saveF1Session = async (session: SessionState): Promise<void> => {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Build per-driver summaries from accumulated session data.
    const driverSummaries: DriverSummary[] = []

    session.drivers.forEach((driver, driverNumber) => {
      // Collect all completed laps for this driver.
      const laps: LapSummary[] = []
      session.completedLaps.forEach((lap) => {
        if (lap.driver_number !== driverNumber) return

        // Determine the tyre compound for this lap from stint data.
        const stint = session.driverStints.get(driverNumber)
        const compound = stint?.compound ?? null

        laps.push({
          lapNumber: lap.lap_number,
          lapDuration: lap.lap_duration,
          sectorTimes: {
            s1: lap.duration_sector_1,
            s2: lap.duration_sector_2,
            s3: lap.duration_sector_3,
          },
          segments: {
            sector1: lap.segments_sector_1 ?? [],
            sector2: lap.segments_sector_2 ?? [],
            sector3: lap.segments_sector_3 ?? [],
          },
          isPitOutLap: lap.is_pit_out_lap,
          compound,
        })
      })

      // Sort laps by lap number.
      laps.sort((a, b) => a.lapNumber - b.lapNumber)

      // Build stint summary.
      const stintState = session.driverStints.get(driverNumber)
      const stints: StintSummary[] = stintState
        ? [{
            stintNumber: stintState.stintNumber,
            compound: stintState.compound,
            lapStart: stintState.lapStart,
            lapEnd: null,
            tyreAgeAtStart: stintState.tyreAgeAtStart,
          }]
        : []

      // Build pit stop summary.
      const pitState = session.driverPitStops.get(driverNumber)
      const pitStops: PitStopSummary = {
        count: pitState?.count ?? 0,
        lastDuration: pitState?.lastDuration ?? null,
      }

      driverSummaries.push({
        driverNumber,
        nameAcronym: driver.nameAcronym,
        fullName: driver.fullName,
        teamName: driver.teamName,
        teamColour: driver.teamColour,
        finalPosition: session.driverPositions.get(driverNumber) ?? null,
        bestLapTime: session.driverBestLap.get(driverNumber) ?? null,
        laps,
        stints,
        pitStops,
      })
    })

    // Build weather snapshots from the last known state.
    const weatherSnapshots: WeatherSnapshot[] = session.weather
      ? [{ date: now.toISOString(), airTemp: session.weather.airTemperature, trackTemp: session.weather.trackTemperature, humidity: session.weather.humidity, rainfall: session.weather.rainfall }]
      : []

    // Build race control events.
    const raceControlEvents: RaceControlRecord[] = session.raceControlMessages.map((e) => ({
      date: e.date,
      category: e.category,
      message: e.message,
      flag: e.flag,
    }))

    // Build overtake records.
    const overtakes: OvertakeRecord[] = session.overtakes.map((o) => ({
      date: o.date,
      overtakingDriver: o.overtakingDriverNumber,
      overtakenDriver: o.overtakenDriverNumber,
      position: o.position,
    }))

    // Upsert the session document.
    await F1Session.findOneAndUpdate(
      { sessionKey: session.sessionKey },
      {
        meetingKey: session.meetingKey,
        trackName: session.trackName,
        sessionType: session.sessionType,
        sessionName: session.sessionName,
        driverSummaries,
        weatherSnapshots,
        raceControlEvents,
        overtakes,
        startedAt: now,
        endedAt: now,
        expiresAt: thirtyDaysFromNow,
      },
      { upsert: true, new: true },
    )

    log.info(`✓ Saved F1 session data for "${session.trackName}" (${driverSummaries.length} drivers, expires ${thirtyDaysFromNow.toISOString()})`)
  } catch (err) {
    log.error("✗ Failed to save F1 session data:", err)
  }
}

export default F1Session
