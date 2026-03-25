// Light status type for race start sequence and build-up ceremony
export type StartLightsStatus =
  | "off"
  | "red1"
  | "red2"
  | "red3"
  | "red4"
  | "red5"
  | "green"
  | "orange"
  | "orange_flash"
  // Build-up ceremony statuses (columns turn OFF left to right)
  | "ceremony_10red"
  | "ceremony_8red"
  | "ceremony_6red"
  | "ceremony_4red"
  | "ceremony_2red"

// Colour palette
const def = "#202C3D"
const red = "#F62A31"
const green = "#00FF00"
const orange = "#FFBB00"

// Each row can be any number of different lights so we do it this way to define exact order of lights
export const defaultLights = [def, def, def, def, def]
export const redLights = [red, red, red, red, red]
export const greenLights = [green, green, green, green, green]
export const orangeLights = [orange, orange, orange, orange, orange]

// Race start sequence - columns illuminate left to right
export const red1Lights = [red, def, def, def, def]
export const red2Lights = [red, red, def, def, def]
export const red3Lights = [red, red, red, def, def]
export const red4Lights = [red, red, red, red, def]

// Build-up ceremony patterns - columns turn OFF from left to right (opposite of race start)
export const ceremony8Red = [def, red, red, red, red]
export const ceremony6Red = [def, def, red, red, red]
export const ceremony4Red = [def, def, def, red, red]
export const ceremony2Red = [def, def, def, def, red]

// Maps seconds remaining (in the 5s sequence) to the appropriate light status.
export const getLightStatus = (seconds: number): StartLightsStatus => {
  if (seconds === 5) return "red1"
  if (seconds === 4) return "red2"
  if (seconds === 3) return "red3"
  if (seconds === 2) return "red4"
  if (seconds === 1) return "red5"
  return "off"
}

// Maps build-up seconds remaining to the pre-session ceremony light status.
// Thresholds anchored to "formation lap" at 2:00 (following F1 pre-session procedure).
export const getCeremonyLightStatus = (secondsRemaining: number): StartLightsStatus => {
  if (secondsRemaining > 17 * 60) return "off"            // >17:00 — no lights
  if (secondsRemaining > 7 * 60)  return "ceremony_10red"  // 17:00–7:01 — all 10 reds
  if (secondsRemaining > 5 * 60)  return "ceremony_8red"   // 7:00–5:01 — left column off
  if (secondsRemaining > 3 * 60)  return "ceremony_6red"   // 5:00–3:01 — 2 left columns off
  if (secondsRemaining > 2 * 60 + 15) return "ceremony_4red" // 3:00–2:16 — 3 left columns off
  if (secondsRemaining > 2 * 60)  return "ceremony_2red"   // 2:15–2:01 — only right column
  if (secondsRemaining > 2 * 60 - 15) return "green"       // 2:00–1:46 — green for 15 seconds
  return "off"                                              // 1:45–0:30 — all lights off
}
