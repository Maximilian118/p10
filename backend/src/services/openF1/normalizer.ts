import {
  OpenF1LocationMsg,
  OpenF1LapMsg,
  OpenF1SessionMsg,
  OpenF1DriverMsg,
  OpenF1CarDataMsg,
  OpenF1IntervalMsg,
  OpenF1PitMsg,
  OpenF1StintMsg,
  OpenF1PositionMsg,
  OpenF1RaceControlMsg,
  OpenF1WeatherMsg,
  OpenF1OvertakeMsg,
} from "./types"

// ─── Internal Event Types ─────────────────────────────────────────

// All possible internal event types produced by the normalizer.
export type InternalEventType =
  | "session" | "drivers" | "location" | "lap" | "car_data"
  | "interval" | "pit" | "stint" | "position" | "race_control"
  | "weather" | "overtake" | "clock" | "lapcount"
  | "team_radio" | "session_data"

// Source-agnostic event that the session manager consumes.
// Both SignalR and OpenF1 produce these through their respective normalizers.
export interface InternalEvent {
  type: InternalEventType
  driverNumber?: number
  data: Record<string, unknown>
  timestamp: number
  source: "signalr" | "openf1" | "demo"
}

// ─── OpenF1 → Internal Normalizers ────────────────────────────────

// Normalizes an OpenF1 session message.
export const normalizeOpenF1Session = (msg: OpenF1SessionMsg): InternalEvent => ({
  type: "session",
  data: {
    sessionKey: msg.session_key,
    meetingKey: msg.meeting_key,
    sessionName: msg.session_name,
    sessionType: msg.session_type,
    status: msg.status,
    dateStart: msg.date_start,
    dateEnd: msg.date_end,
    circuitShortName: msg.circuit_short_name,
    circuitKey: msg.circuit_key,
  },
  timestamp: Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 driver message.
export const normalizeOpenF1Driver = (msg: OpenF1DriverMsg): InternalEvent => ({
  type: "drivers",
  driverNumber: msg.driver_number,
  data: {
    driverNumber: msg.driver_number,
    nameAcronym: msg.name_acronym,
    fullName: msg.full_name,
    teamName: msg.team_name,
    teamColour: msg.team_colour,
    headshotUrl: msg.headshot_url,
  },
  timestamp: Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 location message.
export const normalizeOpenF1Location = (msg: OpenF1LocationMsg): InternalEvent => ({
  type: "location",
  driverNumber: msg.driver_number,
  data: { x: msg.x, y: msg.y, z: msg.z, date: msg.date },
  timestamp: new Date(msg.date).getTime(),
  source: "openf1",
})

// Normalizes an OpenF1 lap message.
export const normalizeOpenF1Lap = (msg: OpenF1LapMsg): InternalEvent => ({
  type: "lap",
  driverNumber: msg.driver_number,
  data: {
    lapNumber: msg.lap_number,
    lapDuration: msg.lap_duration,
    s1: msg.duration_sector_1,
    s2: msg.duration_sector_2,
    s3: msg.duration_sector_3,
    isPitOutLap: msg.is_pit_out_lap,
    i1Speed: msg.i1_speed,
    i2Speed: msg.i2_speed,
    stSpeed: msg.st_speed,
    dateStart: msg.date_start,
    segmentsSector1: msg.segments_sector_1,
    segmentsSector2: msg.segments_sector_2,
    segmentsSector3: msg.segments_sector_3,
  },
  timestamp: msg.date_start ? new Date(msg.date_start).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 car_data message.
export const normalizeOpenF1CarData = (msg: OpenF1CarDataMsg): InternalEvent => ({
  type: "car_data",
  driverNumber: msg.driver_number,
  data: {
    speed: msg.speed,
    drs: msg.drs,
    gear: msg.n_gear,
    rpm: msg.rpm,
    throttle: msg.throttle,
    brake: msg.brake,
  },
  timestamp: new Date(msg.date).getTime(),
  source: "openf1",
})

// Normalizes an OpenF1 interval message.
export const normalizeOpenF1Interval = (msg: OpenF1IntervalMsg): InternalEvent => ({
  type: "interval",
  driverNumber: msg.driver_number,
  data: {
    gapToLeader: msg.gap_to_leader,
    interval: msg.interval,
  },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 pit message.
export const normalizeOpenF1Pit = (msg: OpenF1PitMsg): InternalEvent => ({
  type: "pit",
  driverNumber: msg.driver_number,
  data: {
    lapNumber: msg.lap_number,
    pitDuration: msg.pit_duration,
    stopDuration: msg.stop_duration,
    laneDuration: msg.lane_duration,
  },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 stint message.
export const normalizeOpenF1Stint = (msg: OpenF1StintMsg): InternalEvent => ({
  type: "stint",
  driverNumber: msg.driver_number,
  data: {
    compound: msg.compound,
    stintNumber: msg.stint_number,
    lapStart: msg.lap_start,
    lapEnd: msg.lap_end,
    tyreAgeAtStart: msg.tyre_age_at_start,
  },
  timestamp: Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 position message.
export const normalizeOpenF1Position = (msg: OpenF1PositionMsg): InternalEvent => ({
  type: "position",
  driverNumber: msg.driver_number,
  data: { position: msg.position },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 race control message.
export const normalizeOpenF1RaceControl = (msg: OpenF1RaceControlMsg): InternalEvent => ({
  type: "race_control",
  driverNumber: msg.driver_number ?? undefined,
  data: {
    date: msg.date,
    category: msg.category,
    message: msg.message,
    flag: msg.flag,
    scope: msg.scope,
    sector: msg.sector,
    driverNumber: msg.driver_number,
    lapNumber: msg.lap_number,
  },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 weather message.
export const normalizeOpenF1Weather = (msg: OpenF1WeatherMsg): InternalEvent => ({
  type: "weather",
  data: {
    airTemperature: msg.air_temperature,
    trackTemperature: msg.track_temperature,
    humidity: msg.humidity,
    rainfall: msg.rainfall > 0,
    windSpeed: msg.wind_speed,
    windDirection: msg.wind_direction,
    pressure: msg.pressure,
  },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// Normalizes an OpenF1 overtake message.
export const normalizeOpenF1Overtake = (msg: OpenF1OvertakeMsg): InternalEvent => ({
  type: "overtake",
  data: {
    date: msg.date,
    overtakingDriverNumber: msg.overtaking_driver_number,
    overtakenDriverNumber: msg.overtaken_driver_number,
    position: msg.position,
  },
  timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
  source: "openf1",
})

// ─── SignalR → Internal Normalizers ───────────────────────────────

// Normalizes a SignalR ExtrapolatedClock update to an internal clock event.
export const normalizeSignalRClock = (
  remainingMs: number,
  running: boolean,
): InternalEvent => ({
  type: "clock",
  data: { remainingMs, running, serverTs: Date.now(), speed: 1 },
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR TimingAppData stint update for a single driver.
export const normalizeSignalRStint = (
  driverNumber: number,
  compound: string,
  stintNumber: number,
  totalLaps: number,
  isNew: boolean,
): InternalEvent => ({
  type: "stint",
  driverNumber,
  data: {
    compound,
    stintNumber,
    lapStart: 0,
    lapEnd: null,
    tyreAgeAtStart: 0,
    totalLaps,
    isNew,
  },
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR TimingData position/gap update for a single driver.
export const normalizeSignalRTiming = (
  driverNumber: number,
  data: Record<string, unknown>,
): InternalEvent => ({
  type: "interval",
  driverNumber,
  data,
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR DriverList entry.
export const normalizeSignalRDriver = (
  driverNumber: number,
  data: Record<string, unknown>,
): InternalEvent => ({
  type: "drivers",
  driverNumber,
  data: {
    driverNumber,
    nameAcronym: data.Tla ?? data.tla,
    fullName: data.FullName ?? data.fullName,
    teamName: data.TeamName ?? data.teamName,
    teamColour: data.TeamColour ?? data.teamColour,
    headshotUrl: data.HeadshotUrl ?? data.headshotUrl ?? null,
  },
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR WeatherData update.
export const normalizeSignalRWeather = (data: Record<string, unknown>): InternalEvent => ({
  type: "weather",
  data: {
    airTemperature: data.AirTemp ?? 0,
    trackTemperature: data.TrackTemp ?? 0,
    humidity: data.Humidity ?? 0,
    rainfall: data.Rainfall === "1" || data.Rainfall === true,
    windSpeed: data.WindSpeed ?? 0,
    windDirection: data.WindDirection ?? 0,
    pressure: data.Pressure ?? 0,
  },
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR RaceControlMessages entry.
export const normalizeSignalRRaceControl = (data: Record<string, unknown>): InternalEvent => ({
  type: "race_control",
  data: {
    date: data.Utc ?? new Date().toISOString(),
    category: data.Category ?? "",
    message: data.Message ?? "",
    flag: data.Flag ?? null,
    scope: data.Scope ?? null,
    sector: data.Sector ?? null,
    driverNumber: data.RacingNumber ? parseInt(data.RacingNumber as string, 10) : null,
    lapNumber: data.Lap ?? null,
  },
  timestamp: Date.now(),
  source: "signalr",
})

// Normalizes a SignalR LapCount update.
export const normalizeSignalRLapCount = (data: Record<string, unknown>): InternalEvent => ({
  type: "lapcount",
  data: {
    currentLap: data.CurrentLap ?? 0,
    totalLaps: data.TotalLaps ?? null,
  },
  timestamp: Date.now(),
  source: "signalr",
})

// ─── OpenF1 Topic → Normalizer Routing ────────────────────────────

// Maps an OpenF1 MQTT topic + raw data to an InternalEvent.
// Returns null if the topic is unrecognized.
export const normalizeOpenF1Message = (topic: string, data: unknown): InternalEvent | null => {
  switch (topic) {
    case "v1/sessions": return normalizeOpenF1Session(data as OpenF1SessionMsg)
    case "v1/drivers": return normalizeOpenF1Driver(data as OpenF1DriverMsg)
    case "v1/location": return normalizeOpenF1Location(data as OpenF1LocationMsg)
    case "v1/laps": return normalizeOpenF1Lap(data as OpenF1LapMsg)
    case "v1/car_data": return normalizeOpenF1CarData(data as OpenF1CarDataMsg)
    case "v1/intervals": return normalizeOpenF1Interval(data as OpenF1IntervalMsg)
    case "v1/pit": return normalizeOpenF1Pit(data as OpenF1PitMsg)
    case "v1/stints": return normalizeOpenF1Stint(data as OpenF1StintMsg)
    case "v1/position": return normalizeOpenF1Position(data as OpenF1PositionMsg)
    case "v1/race_control": return normalizeOpenF1RaceControl(data as OpenF1RaceControlMsg)
    case "v1/weather": return normalizeOpenF1Weather(data as OpenF1WeatherMsg)
    case "v1/overtakes": return normalizeOpenF1Overtake(data as OpenF1OvertakeMsg)
    default: return null
  }
}
