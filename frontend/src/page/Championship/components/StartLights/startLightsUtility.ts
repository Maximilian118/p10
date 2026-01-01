// Light status type for race start sequence
export type StartLightsStatus = "off" | "red1" | "red2" | "red3" | "red4" | "red5" | "go" | "red" | "yellow" | "green" | "default" | "hazard"

// Colour palette
const def = "#202C3D"
const red = "#F62A31"
const yellow = "#FFD700"

// Each row can be any number of different lights so we do it this way to define exact order of lights
export const defaultLights = [def, def, def, def, def]
export const redLights = [red, red, red, red, red]
export const hazardLights = [def, yellow, def, yellow, def]

// Race start sequence - columns illuminate left to right
export const red1Lights = [red, def, def, def, def]
export const red2Lights = [red, red, def, def, def]
export const red3Lights = [red, red, red, def, def]
export const red4Lights = [red, red, red, red, def]

// Returns a weighted random delay between 0.5s and 5s, centered around 2s using triangular distribution.
export const randomiseRoundStartTime = (): number => {
  const min = 0.5
  const max = 5
  const mode = 2
  const u = Math.random()
  const fc = (mode - min) / (max - min)

  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min))
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
}

// Maps seconds remaining (in the 5s sequence) to the appropriate light status.
export const getLightStatus = (seconds: number): StartLightsStatus => {
  if (seconds > 5) return "off"
  if (seconds === 5) return "red1"
  if (seconds === 4) return "red2"
  if (seconds === 3) return "red3"
  if (seconds === 2) return "red4"
  if (seconds === 1) return "red5"
  return "go"
}
