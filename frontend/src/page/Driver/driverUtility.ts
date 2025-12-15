import { driverType } from "../../shared/types"

// Chart data point for Nivo line graph.
interface ChartDataPoint {
  x: number
  y: number
}

// Line data for Nivo line graph.
interface ChartLine {
  id: string
  data: ChartDataPoint[]
}

// Extract driver position history from championship data for Nivo line chart.
// Returns one line per series, showing positionActual over time from latest season.
export const getDriverChartData = (driver: driverType | null): ChartLine[] => {
  if (!driver?.series) return []

  return driver.series.map(series => {
    const positions: ChartDataPoint[] = []
    let roundIndex = 0

    series.championships?.forEach(champ => {
      // Find the latest season in history.
      const latestSeason = champ.history?.reduce((latest, current) => {
        if (!latest || current.season > latest.season) return current
        return latest
      }, null as typeof champ.history[0] | null)

      // Collect positionActual from the latest season's rounds.
      latestSeason?.rounds?.forEach(round => {
        const driverEntry = round.drivers?.find(d => d.driver._id === driver._id)
        if (driverEntry?.positionActual) {
          positions.push({ x: roundIndex++, y: driverEntry.positionActual })
        }
      })
    })

    return {
      id: series.name,
      data: positions
    }
  }).filter(line => line.data.length > 0)
}
