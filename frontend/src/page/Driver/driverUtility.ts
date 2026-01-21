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

// Get P10 finishes for driver.
export const getDriverP10Finishes = (driver: driverType | null): number => {
  return driver?.stats?.positionHistory?.["P10"] || 0
}

// Get P9 finishes (runner-ups) for driver.
export const getDriverRunnerUps = (driver: driverType | null): number => {
  return driver?.stats?.positionHistory?.["P9"] || 0
}

// Find best position driver achieved.
export const getDriverBestPosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history || Object.keys(history).length === 0) return null

  let best: number | null = null
  Object.entries(history).forEach(([key, count]) => {
    // Keys are prefixed with "P" (e.g., "P1", "P10")
    const position = parseInt(key.replace("P", ""), 10)
    if (count > 0 && (best === null || position < best)) {
      best = position
    }
  })

  return best
}

// Find worst position driver achieved.
export const getDriverWorstPosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history || Object.keys(history).length === 0) return null

  let worst: number | null = null
  Object.entries(history).forEach(([key, count]) => {
    // Keys are prefixed with "P" (e.g., "P1", "P10")
    const position = parseInt(key.replace("P", ""), 10)
    if (count > 0 && (worst === null || position > worst)) {
      worst = position
    }
  })

  return worst
}

// Calculate weighted average position.
export const getDriverAveragePosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history || Object.keys(history).length === 0) return null

  let totalCount = 0
  let weightedSum = 0

  Object.entries(history).forEach(([key, count]) => {
    // Keys are prefixed with "P" (e.g., "P1", "P10")
    const position = parseInt(key.replace("P", ""), 10)
    if (count > 0) {
      totalCount += count
      weightedSum += position * count
    }
  })

  return totalCount > 0 ? Math.round(weightedSum / totalCount) : null
}

// Find best consecutive P10 streak from championship round history.
export const getDriverBestStreak = (driver: driverType | null): number => {
  if (!driver?.series) return 0

  let bestStreak = 0

  driver.series.forEach(series => {
    series.championships?.forEach(champ => {
      champ.history?.forEach(season => {
        let currentStreak = 0

        season.rounds?.forEach(round => {
          const entry = round.drivers?.find(d => d.driver._id === driver._id)

          if (entry?.positionActual === 10) {
            currentStreak++
            bestStreak = Math.max(bestStreak, currentStreak)
          } else {
            currentStreak = 0
          }
        })
      })
    })
  })

  return bestStreak
}

// Count Q1 eliminations (P16-P20) for driver.
export const getDriverQ1DQs = (driver: driverType | null): number => {
  if (!driver?.series) return 0

  let count = 0

  driver.series.forEach(series => {
    series.championships?.forEach(champ => {
      champ.history?.forEach(season => {
        season.rounds?.forEach(round => {
          const entry = round.drivers?.find(d => d.driver._id === driver._id)
          if (entry?.positionActual && entry.positionActual >= 16) {
            count++
          }
        })
      })
    })
  })

  return count
}

// Count Q2 eliminations (P11-P15) for driver.
export const getDriverQ2DQs = (driver: driverType | null): number => {
  if (!driver?.series) return 0

  let count = 0

  driver.series.forEach(series => {
    series.championships?.forEach(champ => {
      champ.history?.forEach(season => {
        season.rounds?.forEach(round => {
          const entry = round.drivers?.find(d => d.driver._id === driver._id)
          if (entry?.positionActual && entry.positionActual >= 11 && entry.positionActual <= 15) {
            count++
          }
        })
      })
    })
  })

  return count
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
