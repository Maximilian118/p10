import F1SessionView from "./F1SessionView/F1SessionView"

// Returns the appropriate API view component based on series shortName.
// Returns null if no API view is available for the series.
export const getAPIView = (shortName?: string) => {
  switch (shortName) {
    case "F1":
      return F1SessionView
    default:
      return null
  }
}

export { F1SessionView }
