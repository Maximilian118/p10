import { driverType } from "../../shared/types"

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
