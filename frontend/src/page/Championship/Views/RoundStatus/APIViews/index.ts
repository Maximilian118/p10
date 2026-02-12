import { f1Config } from "./F1SessionView/config"
import { SeriesConfig } from "./types"

export type { APIViewProps, DemoSession, SeriesConfig } from "./types"

// Returns the series configuration for the given shortName, or null.
// Adding a new series: create its config and add a case here.
export const getSeriesConfig = (shortName?: string): SeriesConfig | null => {
  switch (shortName) {
    case "F1": return f1Config
    default: return null
  }
}
