import zlib from "zlib"
import { StaticMessage } from "./staticFileClient"
import { deepMerge } from "./utils"
import { createLogger } from "../../shared/logger"

const log = createLogger("StaticConverter")

// Accumulated state for stateful deep-merge topics.
interface ConverterState {
  TimingData: Record<string, unknown>
  TimingAppData: Record<string, unknown>
  DriverList: Record<string, unknown>
  RaceControlMessages: Record<string, unknown>
}

// Output message in OpenF1 replay format.
interface ReplayMsg {
  topic: string
  data: unknown
  timestamp: number
}

// Parses a time string like "1:23:45.678" or "23:45.678" to milliseconds.
const parseTimeString = (timeStr: string): number => {
  const parts = timeStr.split(":")
  if (parts.length === 3) {
    const [h, m, s] = parts
    return (parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s)) * 1000
  } else if (parts.length === 2) {
    const [m, s] = parts
    return (parseInt(m) * 60 + parseFloat(s)) * 1000
  }
  return parseFloat(timeStr) * 1000
}

// ─── Topic Converters ───────────────────────────────────────────

// Converts TimingData updates to v1/intervals + v1/position messages.
const convertTimingData = (
  data: Record<string, unknown>,
  state: ConverterState,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  deepMerge(state.TimingData, data)
  const lines = state.TimingData.Lines as Record<string, Record<string, unknown>> | undefined
  if (!lines) return []

  const result: ReplayMsg[] = []

  for (const [numStr, driverData] of Object.entries(lines)) {
    const driverNumber = parseInt(numStr, 10)
    if (isNaN(driverNumber)) continue

    // Emit position event.
    if (driverData.Position !== undefined) {
      result.push({
        topic: "v1/position",
        data: {
          meeting_key: meetingKey,
          session_key: sessionKey,
          driver_number: driverNumber,
          date: new Date(ts).toISOString(),
          position: parseInt(driverData.Position as string, 10),
          _key: "", _id: 0,
        },
        timestamp: ts,
      })
    }

    // Emit interval event.
    if (driverData.GapToLeader !== undefined || driverData.IntervalToPositionAhead !== undefined) {
      const interval = driverData.IntervalToPositionAhead as Record<string, unknown> | undefined
      result.push({
        topic: "v1/intervals",
        data: {
          meeting_key: meetingKey,
          session_key: sessionKey,
          driver_number: driverNumber,
          date: new Date(ts).toISOString(),
          gap_to_leader: driverData.GapToLeader ?? null,
          interval: interval?.Value ?? null,
          _key: "", _id: 0,
        },
        timestamp: ts,
      })
    }
  }

  return result
}

// Converts TimingAppData updates to v1/stints messages.
const convertTimingAppData = (
  data: Record<string, unknown>,
  state: ConverterState,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  deepMerge(state.TimingAppData, data)
  const lines = state.TimingAppData.Lines as Record<string, Record<string, unknown>> | undefined
  if (!lines) return []

  const result: ReplayMsg[] = []

  for (const [numStr, driverData] of Object.entries(lines)) {
    const driverNumber = parseInt(numStr, 10)
    if (isNaN(driverNumber)) continue

    const stints = driverData.Stints as Record<string, Record<string, unknown>> | undefined
    if (!stints) continue

    // Find the latest stint with a compound.
    const entries = Object.entries(stints).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    if (entries.length === 0) continue

    const [idx, stint] = entries[entries.length - 1]
    if (!stint.Compound) continue

    result.push({
      topic: "v1/stints",
      data: {
        meeting_key: meetingKey,
        session_key: sessionKey,
        driver_number: driverNumber,
        compound: stint.Compound,
        stint_number: parseInt(idx, 10) + 1,
        lap_start: (stint.LapStart as number) ?? 0,
        lap_end: (stint.LapEnd as number) ?? null,
        tyre_age_at_start: 0,
        _key: "", _id: 0,
      },
      timestamp: ts,
    })
  }

  return result
}

// Converts DriverList updates to v1/drivers messages.
const convertDriverList = (
  data: Record<string, unknown>,
  state: ConverterState,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  deepMerge(state.DriverList, data)
  const result: ReplayMsg[] = []

  for (const [numStr, raw] of Object.entries(state.DriverList)) {
    const driverNumber = parseInt(numStr, 10)
    if (isNaN(driverNumber)) continue
    const d = raw as Record<string, unknown>

    result.push({
      topic: "v1/drivers",
      data: {
        meeting_key: meetingKey,
        session_key: sessionKey,
        driver_number: driverNumber,
        full_name: (d.FullName as string) ?? "",
        name_acronym: (d.Tla as string) ?? "",
        team_name: (d.TeamName as string) ?? "",
        team_colour: (d.TeamColour as string) ?? "",
        headshot_url: (d.HeadshotUrl as string) ?? null,
        _key: "", _id: 0,
      },
      timestamp: ts,
    })
  }

  return result
}

// Converts RaceControlMessages updates to v1/race_control messages.
const convertRaceControlMessages = (
  data: Record<string, unknown>,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  const messages = data.Messages as Record<string, Record<string, unknown>> | undefined
  if (!messages) return []

  return Object.values(messages).map((msg) => ({
    topic: "v1/race_control",
    data: {
      meeting_key: meetingKey,
      session_key: sessionKey,
      date: (msg.Utc as string) ?? new Date(ts).toISOString(),
      category: (msg.Category as string) ?? "",
      message: (msg.Message as string) ?? "",
      flag: (msg.Flag as string) ?? null,
      scope: (msg.Scope as string) ?? null,
      sector: msg.Sector ?? null,
      driver_number: msg.RacingNumber ? parseInt(msg.RacingNumber as string, 10) : null,
      lap_number: (msg.Lap as number) ?? null,
      _key: "", _id: 0,
    },
    timestamp: ts,
  }))
}

// Converts WeatherData updates to v1/weather messages.
const convertWeatherData = (
  data: Record<string, unknown>,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => [{
  topic: "v1/weather",
  data: {
    meeting_key: meetingKey,
    session_key: sessionKey,
    date: new Date(ts).toISOString(),
    air_temperature: parseFloat((data.AirTemp as string) ?? "0"),
    track_temperature: parseFloat((data.TrackTemp as string) ?? "0"),
    humidity: parseFloat((data.Humidity as string) ?? "0"),
    pressure: parseFloat((data.Pressure as string) ?? "0"),
    rainfall: data.Rainfall === "1" ? 1 : 0,
    wind_speed: parseFloat((data.WindSpeed as string) ?? "0"),
    wind_direction: parseInt((data.WindDirection as string) ?? "0", 10),
    _key: "", _id: 0,
  },
  timestamp: ts,
}]

// Converts ExtrapolatedClock updates to synthetic:clock messages.
const convertClock = (data: Record<string, unknown>, ts: number): ReplayMsg[] => {
  if (!data.Remaining) return []
  return [{
    topic: "synthetic:clock",
    data: {
      remainingMs: parseTimeString(data.Remaining as string),
      running: data.Extrapolating === true,
    },
    timestamp: ts,
  }]
}

// Decompresses a base64+deflate-raw compressed topic payload.
const decompressZData = (data: Record<string, unknown>): unknown[] => {
  try {
    // The data for .z topics is a base64-encoded deflate-raw compressed JSON string.
    const encoded = typeof data === "string" ? data : JSON.stringify(data)
    const buffer = Buffer.from(encoded, "base64")
    const inflated = zlib.inflateRawSync(buffer)
    return JSON.parse(inflated.toString())
  } catch {
    return []
  }
}

// Converts Position.z compressed data to v1/location messages.
const convertPositionZ = (
  data: Record<string, unknown>,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  const frames = decompressZData(data)
  const result: ReplayMsg[] = []

  for (const rawFrame of frames) {
    const frame = rawFrame as Record<string, unknown>
    const frameTs = frame.Timestamp ? new Date(frame.Timestamp as string).getTime() : ts
    const entries = frame.Entries as Record<string, Record<string, unknown>> | undefined
    if (!entries) continue

    for (const [numStr, pos] of Object.entries(entries)) {
      const driverNumber = parseInt(numStr, 10)
      if (isNaN(driverNumber)) continue

      result.push({
        topic: "v1/location",
        data: {
          meeting_key: meetingKey,
          session_key: sessionKey,
          driver_number: driverNumber,
          date: new Date(frameTs).toISOString(),
          x: (pos.X as number) ?? 0,
          y: (pos.Y as number) ?? 0,
          z: (pos.Z as number) ?? 0,
          _key: "", _id: 0,
        },
        timestamp: frameTs,
      })
    }
  }

  return result
}

// Converts CarData.z compressed data to v1/car_data messages.
const convertCarDataZ = (
  data: Record<string, unknown>,
  ts: number,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  const frames = decompressZData(data)
  const result: ReplayMsg[] = []

  for (const rawFrame of frames) {
    const frame = rawFrame as Record<string, unknown>
    const frameTs = frame.Timestamp ? new Date(frame.Timestamp as string).getTime() : ts
    const entries = frame.Entries as Record<string, Record<string, unknown>> | undefined
    if (!entries) continue

    for (const [numStr, car] of Object.entries(entries)) {
      const driverNumber = parseInt(numStr, 10)
      if (isNaN(driverNumber)) continue

      // CarData channels: [RPM, Speed, Gear, Throttle, Brake, DRS]
      const channels = car.Channels as number[] | undefined
      if (!channels || channels.length < 6) continue

      result.push({
        topic: "v1/car_data",
        data: {
          meeting_key: meetingKey,
          session_key: sessionKey,
          driver_number: driverNumber,
          date: new Date(frameTs).toISOString(),
          rpm: channels[0] ?? 0,
          speed: channels[1] ?? 0,
          n_gear: channels[2] ?? 0,
          throttle: channels[3] ?? 0,
          brake: channels[4] ?? 0,
          drs: channels[5] ?? 0,
          _key: "", _id: 0,
        },
        timestamp: frameTs,
      })
    }
  }

  return result
}

// ─── Main Converter ─────────────────────────────────────────────

// Converts a single static file message based on its topic.
const convertMessage = (
  msg: StaticMessage,
  state: ConverterState,
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  switch (msg.topic) {
    case "TimingData":
      return convertTimingData(msg.data, state, msg.timestamp, sessionKey, meetingKey)
    case "TimingAppData":
      return convertTimingAppData(msg.data, state, msg.timestamp, sessionKey, meetingKey)
    case "DriverList":
      return convertDriverList(msg.data, state, msg.timestamp, sessionKey, meetingKey)
    case "RaceControlMessages":
      return convertRaceControlMessages(msg.data, msg.timestamp, sessionKey, meetingKey)
    case "WeatherData":
      return convertWeatherData(msg.data, msg.timestamp, sessionKey, meetingKey)
    case "ExtrapolatedClock":
      return convertClock(msg.data, msg.timestamp)
    case "Position.z":
      return convertPositionZ(msg.data, msg.timestamp, sessionKey, meetingKey)
    case "CarData.z":
      return convertCarDataZ(msg.data, msg.timestamp, sessionKey, meetingKey)
    default:
      return []
  }
}

// Converts all static file messages (SignalR format) to OpenF1-format replay messages.
// Handles stateful deep-merge accumulation and per-driver fan-out.
export const convertStaticToOpenF1 = (
  staticMessages: StaticMessage[],
  sessionKey: number,
  meetingKey: number,
): ReplayMsg[] => {
  const state: ConverterState = {
    TimingData: {},
    TimingAppData: {},
    DriverList: {},
    RaceControlMessages: {},
  }

  const output: ReplayMsg[] = []

  for (const msg of staticMessages) {
    const converted = convertMessage(msg, state, sessionKey, meetingKey)
    output.push(...converted)
  }

  // Sort chronologically.
  output.sort((a, b) => a.timestamp - b.timestamp)

  log.info(`Converted ${staticMessages.length} static file messages → ${output.length} OpenF1-format messages`)
  return output
}
