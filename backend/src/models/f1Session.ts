import mongoose from "mongoose"
import { SessionState } from "../services/openF1/types"
import { createLogger } from "../shared/logger"

const log = createLogger("F1Session")

// ─── Sub-Document Types ──────────────────────────────────────────

// Per-driver lap summary stored in the session archive.
export interface LapRecord {
  lapNumber: number
  time: number | null
  s1: number | null
  s2: number | null
  s3: number | null
  position: number | null
  compound: string | null
  isPitOutLap: boolean
  i1Speed: number | null // Speed trap at intermediate 1.
  i2Speed: number | null // Speed trap at intermediate 2.
  stSpeed: number | null // Speed trap on main straight.
}

// Per-driver stint summary.
export interface StintRecord {
  stintNumber: number
  compound: string
  lapStart: number
  lapEnd: number | null
  tyreAgeAtStart: number
  isNew: boolean
}

// Per-driver pit stop record.
export interface PitStopRecord {
  lap: number
  duration: number | null
}

// Per-driver aggregated summary for the session.
export interface DriverSummary {
  driverNumber: number
  nameAcronym: string
  fullName: string
  teamName: string
  teamColour: string
  headshotUrl: string | null
  finalPosition: number | null
  gridPosition: number | null
  driverStatus: "running" | "finished" | "dnf" | "dns" | "dsq"
  bestLapTime: number | null
  bestLapNumber: number | null
  totalLaps: number
  stints: StintRecord[]
  pitStops: PitStopRecord[]
  laps: LapRecord[]
}

// DNF/incident record.
export interface DriverIncident {
  driverNumber: number
  lap: number | null
  reason: string | null
  date: string
}

// Safety car period record.
export interface SafetyCarPeriod {
  type: "SC" | "VSC"
  startLap: number
  endLap: number
  startTime: string
  endTime: string
}

// Red flag period record.
export interface RedFlagPeriod {
  startTime: string
  endTime: string
  reason: string | null
}

// Weather snapshot captured during the session.
export interface WeatherSnapshot {
  date: string
  airTemp: number
  trackTemp: number
  humidity: number
  rainfall: boolean
  windSpeed: number
  windDirection: number
  pressure: number
}

// Race control event record.
export interface RaceControlRecord {
  date: string
  category: string
  message: string
  flag: string | null
  scope: string | null
  driverNumber: number | null
  lapNumber: number | null
}

// Overtake event record.
export interface OvertakeRecord {
  date: string
  overtakingDriver: number
  overtakenDriver: number
  position: number
}

// Replay message for demo sessions.
export interface ReplayMessage {
  topic: string
  data: object
  timestamp: number
}

// ─── Unified F1 Session Document ──────────────────────────────────

// Unified F1 session document stored in MongoDB.
// Replaces the old separate F1Session (summary) and DemoSession (replay cache) models.
export interface F1SessionType {
  // Identity.
  sessionKey: number
  meetingKey: number
  type: "live" | "demo"
  status: "initialising" | "active" | "finished" | "abandoned"

  // Session metadata.
  trackName: string
  circuitKey: number | null
  sessionType: string
  sessionName: string
  startedAt: Date
  endedAt: Date | null
  totalLaps: number | null

  // Participants.
  drivers: DriverSummary[]
  starters: number
  finishers: number
  dnfs: DriverIncident[]
  dnsList: number[]

  // Session timeline.
  raceControlEvents: RaceControlRecord[]
  safetyCarPeriods: SafetyCarPeriod[]
  redFlagPeriods: RedFlagPeriod[]

  // Weather.
  weatherSnapshots: WeatherSnapshot[]

  // Timing.
  fastestLap: { driverNumber: number; time: number; lap: number } | null
  poleTime: number | null

  // Overtakes.
  overtakes: OvertakeRecord[]

  // Team radio messages captured during the session.
  teamRadio: { date: string; driverNumber: number; audioUrl: string }[]

  // Demo replay data (type: "demo" only).
  replayMessages: ReplayMessage[]
  replayEndTs: number

  // Lifecycle.
  lastUpdatedAt: Date
  expiresAt: Date
}

// ─── Mongoose Schema ──────────────────────────────────────────────

const f1SessionSchema = new mongoose.Schema<F1SessionType>({
  sessionKey: { type: Number, required: true, unique: true },
  meetingKey: { type: Number, required: true },
  type: { type: String, enum: ["live", "demo"], required: true },
  status: { type: String, enum: ["initialising", "active", "finished", "abandoned"], default: "initialising" },

  trackName: { type: String, required: true },
  circuitKey: { type: Number, default: null },
  sessionType: { type: String, required: true },
  sessionName: { type: String, required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  totalLaps: { type: Number, default: null },

  drivers: { type: mongoose.Schema.Types.Mixed, default: [] },
  starters: { type: Number, default: 0 },
  finishers: { type: Number, default: 0 },
  dnfs: { type: mongoose.Schema.Types.Mixed, default: [] },
  dnsList: { type: mongoose.Schema.Types.Mixed, default: [] },

  raceControlEvents: { type: mongoose.Schema.Types.Mixed, default: [] },
  safetyCarPeriods: { type: mongoose.Schema.Types.Mixed, default: [] },
  redFlagPeriods: { type: mongoose.Schema.Types.Mixed, default: [] },

  weatherSnapshots: { type: mongoose.Schema.Types.Mixed, default: [] },

  fastestLap: { type: mongoose.Schema.Types.Mixed, default: null },
  poleTime: { type: Number, default: null },

  overtakes: { type: mongoose.Schema.Types.Mixed, default: [] },

  teamRadio: { type: mongoose.Schema.Types.Mixed, default: [] },

  replayMessages: { type: mongoose.Schema.Types.Mixed, default: [] },
  replayEndTs: { type: Number, default: 0 },

  lastUpdatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
})

// TTL index — MongoDB automatically deletes documents once expiresAt has passed.
f1SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const F1Session = mongoose.model<F1SessionType>("F1Session", f1SessionSchema)

// ─── Progressive Save Functions ───────────────────────────────────

// Creates the initial F1Session document when a session is first detected.
export const createF1Session = async (
  sessionKey: number,
  meetingKey: number,
  type: "live" | "demo",
  trackName: string,
  circuitKey: number | null,
  sessionType: string,
  sessionName: string,
): Promise<void> => {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await F1Session.findOneAndUpdate(
      { sessionKey },
      {
        $setOnInsert: {
          meetingKey,
          type,
          status: "initialising",
          trackName,
          circuitKey,
          sessionType,
          sessionName,
          startedAt: now,
          endedAt: null,
          totalLaps: null,
          drivers: [],
          starters: 0,
          finishers: 0,
          dnfs: [],
          dnsList: [],
          raceControlEvents: [],
          safetyCarPeriods: [],
          redFlagPeriods: [],
          weatherSnapshots: [],
          fastestLap: null,
          poleTime: null,
          overtakes: [],
          teamRadio: [],
          replayMessages: [],
          replayEndTs: 0,
          lastUpdatedAt: now,
          expiresAt,
        },
      },
      { upsert: true, new: true },
    )

    log.info(`✓ Created ${type} session record for "${trackName}" (key: ${sessionKey})`)
  } catch (err) {
    log.error("✗ Failed to create F1 session:", err)
  }
}

// Progressively updates the F1Session with accumulated data from the live session state.
// Called periodically (every 30s) and at session end.
export const updateF1Session = async (session: SessionState): Promise<void> => {
  try {
    const now = new Date()

    // Build per-driver summaries from accumulated session data.
    const drivers: DriverSummary[] = []

    session.drivers.forEach((driver, driverNumber) => {
      // Collect all completed laps for this driver.
      const laps: LapRecord[] = []
      session.completedLaps.forEach((lap) => {
        if (lap.driver_number !== driverNumber) return

        const stint = session.driverStints.get(driverNumber)
        laps.push({
          lapNumber: lap.lap_number,
          time: lap.lap_duration,
          s1: lap.duration_sector_1,
          s2: lap.duration_sector_2,
          s3: lap.duration_sector_3,
          position: session.driverPositions.get(driverNumber) ?? null,
          compound: stint?.compound ?? null,
          isPitOutLap: lap.is_pit_out_lap,
          i1Speed: lap.i1_speed ?? null,
          i2Speed: lap.i2_speed ?? null,
          stSpeed: lap.st_speed ?? null,
        })
      })
      laps.sort((a, b) => a.lapNumber - b.lapNumber)

      // Build stint records from the full stint history.
      const stintHistory = session.driverStintHistory.get(driverNumber) ?? []
      const currentStint = session.driverStints.get(driverNumber)
      const stints: StintRecord[] = stintHistory.map((s) => ({
        stintNumber: s.stintNumber,
        compound: s.compound,
        lapStart: s.lapStart,
        lapEnd: s.lapEnd ?? null,
        tyreAgeAtStart: s.tyreAgeAtStart,
        isNew: s.isNew ?? false,
      }))

      // If there's a current stint not yet in history, add it.
      if (currentStint && (stints.length === 0 || stints[stints.length - 1].stintNumber < currentStint.stintNumber)) {
        stints.push({
          stintNumber: currentStint.stintNumber,
          compound: currentStint.compound,
          lapStart: currentStint.lapStart,
          lapEnd: null,
          tyreAgeAtStart: currentStint.tyreAgeAtStart,
          isNew: currentStint.isNew ?? false,
        })
      }

      // Build pit stop records from the full pit stop history.
      const pitHistory = session.driverPitStopHistory.get(driverNumber) ?? []
      const pitStops: PitStopRecord[] = pitHistory.map((p) => ({
        lap: p.lap,
        duration: p.duration,
      }))

      // Determine driver status by cross-referencing DNF records.
      const isDnf = session.dnfs.some((d) => d.driverNumber === driverNumber)

      // Find the lap number of the driver's best lap time.
      let bestLapNumber: number | null = null
      const driverBestTime = session.driverBestLap.get(driverNumber)
      if (driverBestTime) {
        session.completedLaps.forEach((lap) => {
          if (lap.driver_number === driverNumber && lap.lap_duration === driverBestTime) {
            bestLapNumber = lap.lap_number
          }
        })
      }

      drivers.push({
        driverNumber,
        nameAcronym: driver.nameAcronym,
        fullName: driver.fullName,
        teamName: driver.teamName,
        teamColour: driver.teamColour,
        headshotUrl: driver.headshotUrl,
        finalPosition: session.driverPositions.get(driverNumber) ?? null,
        gridPosition: session.driverGridPositions?.get(driverNumber) ?? null,
        driverStatus: isDnf ? "dnf" : "running",
        bestLapTime: session.driverBestLap.get(driverNumber) ?? null,
        bestLapNumber,
        totalLaps: session.currentLapByDriver.get(driverNumber) ?? 0,
        stints,
        pitStops,
        laps,
      })
    })

    // Count finishers (drivers not marked as DNF).
    const finishers = drivers.filter((d) => d.driverStatus !== "dnf").length

    // Set pole time for qualifying/shootout sessions.
    const isQualifying = session.sessionType?.toLowerCase().includes("qualifying") ||
      session.sessionType?.toLowerCase().includes("shootout")
    const poleTime = isQualifying && session.bestLapTime > 0 ? session.bestLapTime : null

    // Build weather snapshots from the current state.
    const weatherSnapshots: WeatherSnapshot[] = session.weather
      ? [{
          date: now.toISOString(),
          airTemp: session.weather.airTemperature,
          trackTemp: session.weather.trackTemperature,
          humidity: session.weather.humidity,
          rainfall: session.weather.rainfall,
          windSpeed: session.weather.windSpeed,
          windDirection: session.weather.windDirection,
          pressure: session.weather.pressure,
        }]
      : []

    // Build race control events.
    const raceControlEvents: RaceControlRecord[] = session.raceControlMessages.map((e) => ({
      date: e.date,
      category: e.category,
      message: e.message,
      flag: e.flag,
      scope: e.scope,
      driverNumber: e.driverNumber,
      lapNumber: e.lapNumber,
    }))

    // Build overtake records.
    const overtakes: OvertakeRecord[] = session.overtakes.map((o) => ({
      date: o.date,
      overtakingDriver: o.overtakingDriverNumber,
      overtakenDriver: o.overtakenDriverNumber,
      position: o.position,
    }))

    // Build team radio records.
    const teamRadio = session.teamRadio.map((r) => ({
      date: r.date,
      driverNumber: r.driverNumber,
      audioUrl: r.audioUrl,
    }))

    // Find the session-wide fastest lap.
    let fastestLap: { driverNumber: number; time: number; lap: number } | null = null
    session.driverBestLap.forEach((time, driverNumber) => {
      if (!fastestLap || time < fastestLap.time) {
        fastestLap = { driverNumber, time, lap: 0 }
      }
    })

    // Build safety car, red flag, and DNF records from session state.
    const safetyCarPeriods = session.safetyCarPeriods.map((p) => ({
      type: p.type,
      startLap: p.startLap,
      endLap: p.endLap,
      startTime: p.startTime,
      endTime: p.endTime,
    }))

    const redFlagPeriods = session.redFlagPeriods.map((p) => ({
      startTime: p.startTime,
      endTime: p.endTime,
      reason: p.reason,
    }))

    const dnfs: DriverIncident[] = session.dnfs.map((d) => ({
      driverNumber: d.driverNumber,
      lap: d.lap,
      reason: d.reason,
      date: d.date,
    }))

    await F1Session.findOneAndUpdate(
      { sessionKey: session.sessionKey },
      {
        $set: {
          status: "active",
          drivers,
          starters: drivers.length,
          finishers,
          dnfs,
          weatherSnapshots,
          raceControlEvents,
          safetyCarPeriods,
          redFlagPeriods,
          overtakes,
          teamRadio,
          fastestLap,
          poleTime,
          totalLaps: session.totalLaps,
          lastUpdatedAt: now,
        },
      },
    )

    log.verbose(`↻ Updated session data for "${session.trackName}" (${drivers.length} drivers)`)
  } catch (err) {
    log.error("✗ Failed to update F1 session:", err)
  }
}

// Finalizes a live session — marks as finished with end time.
export const finalizeF1Session = async (sessionKey: number, session: SessionState): Promise<void> => {
  try {
    // Run one final progressive update to capture latest data.
    await updateF1Session(session)

    await F1Session.findOneAndUpdate(
      { sessionKey },
      { $set: { status: "finished", endedAt: new Date(), lastUpdatedAt: new Date() } },
    )

    log.info(`✓ Finalized session ${sessionKey}`)
  } catch (err) {
    log.error("✗ Failed to finalize F1 session:", err)
  }
}

// ─── Demo Session Helpers ─────────────────────────────────────────

// Loads cached demo replay messages from the unified F1Session model.
export const loadDemoSession = async (
  sessionKey: number,
): Promise<{ messages: ReplayMessage[]; circuitKey: number | null; trackName: string; sessionEndTs: number; sessionType: string; totalLaps: number | null } | null> => {
  const doc = await F1Session.findOne({ sessionKey, type: "demo" })
  if (!doc || doc.replayMessages.length === 0) return null

  return {
    messages: doc.replayMessages,
    circuitKey: doc.circuitKey,
    trackName: doc.trackName,
    sessionEndTs: doc.replayEndTs,
    sessionType: doc.sessionType,
    totalLaps: doc.totalLaps ?? null,
  }
}

// Saves demo replay messages to the unified F1Session model.
export const saveDemoSession = async (
  sessionKey: number,
  meetingKey: number,
  circuitKey: number | null,
  trackName: string,
  sessionType: string,
  sessionName: string,
  driverCount: number,
  sessionEndTs: number,
  messages: ReplayMessage[],
  totalLaps: number | null,
): Promise<void> => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await F1Session.findOneAndUpdate(
    { sessionKey },
    {
      $set: {
        meetingKey,
        type: "demo",
        status: "finished",
        trackName,
        circuitKey,
        sessionType,
        sessionName,
        startedAt: now,
        endedAt: now,
        starters: driverCount,
        replayMessages: messages,
        replayEndTs: sessionEndTs,
        totalLaps,
        lastUpdatedAt: now,
        expiresAt,
      },
      $setOnInsert: {
        drivers: [],
        finishers: 0,
        dnfs: [],
        dnsList: [],
        raceControlEvents: [],
        safetyCarPeriods: [],
        redFlagPeriods: [],
        weatherSnapshots: [],
        fastestLap: null,
        poleTime: null,
        overtakes: [],
        teamRadio: [],
      },
    },
    { upsert: true },
  )

  log.info(`✓ Saved demo session for "${trackName}" (${messages.length} messages)`)
}

// Deletes a cached demo session (for stale cache refresh).
export const deleteDemoSession = async (sessionKey: number): Promise<void> => {
  await F1Session.deleteOne({ sessionKey, type: "demo" })
}

// ─── Legacy Compat Export ─────────────────────────────────────────

// Legacy save function wrapping the new progressive approach.
// Called from sessionManager.endSession() for backwards compatibility during transition.
export const saveF1Session = async (session: SessionState): Promise<void> => {
  await createF1Session(
    session.sessionKey,
    session.meetingKey,
    "live",
    session.trackName,
    null,
    session.sessionType,
    session.sessionName,
  )
  await finalizeF1Session(session.sessionKey, session)
}

export default F1Session
