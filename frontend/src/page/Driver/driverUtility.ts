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
  return driver?.stats?.positionHistory?.[9] || 0
}

// Get P9 finishes (runner-ups) for driver.
export const getDriverRunnerUps = (driver: driverType | null): number => {
  return driver?.stats?.positionHistory?.[8] || 0
}

// Find best position driver achieved.
export const getDriverBestPosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history) return null

  for (let i = 0; i < history.length; i++) {
    if (history[i] > 0) return i + 1
  }
  return null
}

// Find worst position driver achieved.
export const getDriverWorstPosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history) return null

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] > 0) return i + 1
  }
  return null
}

// Calculate weighted average position.
export const getDriverAveragePosition = (driver: driverType | null): number | null => {
  const history = driver?.stats?.positionHistory
  if (!history) return null

  let totalCount = 0
  let weightedSum = 0

  history.forEach((count, idx) => {
    if (count > 0) {
      totalCount += count
      weightedSum += (idx + 1) * count
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
