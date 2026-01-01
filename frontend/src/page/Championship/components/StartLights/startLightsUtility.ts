// Light status type for race start sequence
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

// Maps seconds remaining (in the 5s sequence) to the appropriate light status.
export const getLightStatus = (seconds: number): StartLightsStatus => {
  if (seconds === 5) return "red1"
  if (seconds === 4) return "red2"
  if (seconds === 3) return "red3"
  if (seconds === 2) return "red4"
  if (seconds === 1) return "red5"
  return "off"
}
