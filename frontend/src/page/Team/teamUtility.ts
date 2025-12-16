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

// Sum P10 finishes across all team drivers.
export const getP10Finishes = (drivers: driverType[]): number => {
  return drivers.reduce((sum, d) => sum + (d.stats?.positionHistory?.[9] || 0), 0)
}

// Sum P9 finishes (runner-ups) across all team drivers.
// P9 is one position better than the winning P10 position.
export const getRunnerUps = (drivers: driverType[]): number => {
  return drivers.reduce((sum, d) => sum + (d.stats?.positionHistory?.[8] || 0), 0)
}

// Find best position any team driver achieved.
export const getBestPosition = (drivers: driverType[]): number | null => {
  let best: number | null = null

  drivers.forEach(d => {
    d.stats?.positionHistory?.forEach((count, idx) => {
      if (count > 0 && (best === null || idx < best)) {
        best = idx
      }
    })
  })

  return best !== null ? best + 1 : null
}

// Find worst position any team driver achieved.
export const getWorstPosition = (drivers: driverType[]): number | null => {
  let worst: number | null = null

  drivers.forEach(d => {
    d.stats?.positionHistory?.forEach((count, idx) => {
      if (count > 0 && (worst === null || idx > worst)) {
        worst = idx
      }
    })
  })

  return worst !== null ? worst + 1 : null
}

// Calculate weighted average position across all team drivers.
export const getAveragePosition = (drivers: driverType[]): number | null => {
  let totalCount = 0
  let weightedSum = 0

  drivers.forEach(d => {
    d.stats?.positionHistory?.forEach((count, idx) => {
      if (count > 0) {
        totalCount += count
        weightedSum += (idx + 1) * count
      }
    })
  })

  return totalCount > 0 ? Math.round(weightedSum / totalCount) : null
}

// Find best consecutive P10 streak from championship round history.
export const getBestStreak = (drivers: driverType[]): number => {
  let bestStreak = 0

  drivers.forEach(driver => {
    driver.series?.forEach(series => {
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
  })

  return bestStreak
}

// Extract team position history from championship data for Nivo line chart.
// Aggregates all team drivers' positions by round, averaging when multiple drivers compete.
export const getTeamChartData = (drivers: driverType[]): ChartLine[] => {
  if (!drivers?.length) return []

  // Group positions by series name.
  const seriesMap = new Map<string, Map<number, number[]>>()

  drivers.forEach(driver => {
    driver.series?.forEach(series => {
      const seriesName = series.name || series._id || 'Unknown'

      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, new Map())
      }

      const roundsMap = seriesMap.get(seriesName)!

      series.championships?.forEach(champ => {
        // Find the latest season in history.
        const latestSeason = champ.history?.reduce((latest, current) => {
          if (!latest || current.season > latest.season) return current
          return latest
        }, null as typeof champ.history[0] | null)

        // Collect positionActual from the latest season's rounds.
        latestSeason?.rounds?.forEach((round, roundIdx) => {
          const driverEntry = round.drivers?.find(d => d.driver._id === driver._id)

          if (driverEntry?.positionActual) {
            if (!roundsMap.has(roundIdx)) {
              roundsMap.set(roundIdx, [])
            }
            roundsMap.get(roundIdx)!.push(driverEntry.positionActual)
          }
        })
      })
    })
  })

  // Convert to chart data, averaging positions when multiple drivers in same round.
  const chartLines: ChartLine[] = []

  seriesMap.forEach((roundsMap, seriesName) => {
    const positions: ChartDataPoint[] = []

    // Sort rounds by index and calculate average position.
    const sortedRounds = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0])

    sortedRounds.forEach(([roundIdx, positionsList]) => {
      const avgPosition = Math.round(
        positionsList.reduce((sum, pos) => sum + pos, 0) / positionsList.length
      )
      positions.push({ x: roundIdx, y: avgPosition })
    })

    if (positions.length > 0) {
      chartLines.push({ id: seriesName, data: positions })
    }
  })

  return chartLines
}
