import { RoundType } from "../../../../shared/types"
import { getCompetitorName, getCompetitorId } from "../../../../shared/utility"
import type { PartialTheme } from "@nivo/theming"

// Line chart series type compatible with @nivo/line ResponsiveLine.
export interface LineSerie {
  id: string
  data: { x: string; y: number }[]
}

// Deterministic color palette for competitors, assigned by final standing position.
const COMPETITOR_PALETTE = [
  "#2563EB", // blue
  "#16A34A", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#EA580C", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
  "#A855F7", // violet
]

// Returns a color palette slice for the given competitor count.
export const getCompetitorColors = (count: number): string[] => {
  if (count <= COMPETITOR_PALETTE.length) {
    return COMPETITOR_PALETTE.slice(0, count)
  }
  // For larger counts, cycle through the palette.
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length])
  }
  return colors
}

// Shared Nivo theme for consistent styling across all charts.
export const nivoTheme: PartialTheme = {
  text: {
    fontSize: 11,
    fill: "#5B5B61",
  },
  axis: {
    ticks: {
      text: {
        fontSize: 10,
        fill: "#9E9E9E",
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: "#5B5B61",
      },
    },
  },
  grid: {
    line: {
      stroke: "#E4E4E4",
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: "#2C2C34",
      color: "#f4f4f4",
      fontSize: 12,
      borderRadius: 6,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    },
  },
  legends: {
    text: {
      fontSize: 11,
      fill: "#5B5B61",
    },
  },
}

// Extracts competitor ordering from the last completed round for consistent color assignment.
// Returns array of { id, name } sorted by final position.
const getCompetitorOrder = (completedRounds: RoundType[]): { id: string; name: string }[] => {
  const lastRound = completedRounds[completedRounds.length - 1]
  if (!lastRound) return []

  return [...lastRound.competitors]
    .filter(c => !c.deleted)
    .sort((a, b) => a.position - b.position)
    .map(c => ({
      id: getCompetitorId(c),
      name: getCompetitorName(c),
    }))
}

// Builds a name abbreviation map from completed rounds' competitor names.
export const buildNameMap = (completedRounds: RoundType[]): Map<string, string> => {
  const order = getCompetitorOrder(completedRounds)
  return buildNameAbbreviations(order.map(c => c.name))
}

// Builds a color map keyed by abbreviated competitor name for consistent colors across charts.
export const buildCompetitorColorMap = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): Map<string, string> => {
  const order = getCompetitorOrder(completedRounds)
  const colors = getCompetitorColors(order.length)
  const colorMap = new Map<string, string>()
  order.forEach((c, i) => colorMap.set(nameMap.get(c.name) ?? c.name, colors[i]))
  return colorMap
}

// ---------- CHART 1: Points Progression (Line Chart) ----------

// Builds cumulative grandTotalPoints per competitor across rounds.
export const buildPointsProgressionData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): LineSerie[] => {
  const order = getCompetitorOrder(completedRounds)

  return order.map(({ name }) => ({
    id: nameMap.get(name) ?? name,
    data: completedRounds.map((round, i) => {
      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      return {
        x: `R${i + 1}`,
        y: entry?.grandTotalPoints ?? 0,
      }
    }),
  }))
}

// ---------- CHART 2: Points Distribution (Pie Chart) ----------

export interface PieDatum {
  id: string
  label: string
  value: number
  color?: string
}

// Builds pie chart data from final standings' grandTotalPoints.
export const buildPointsDistributionData = (
  completedRounds: RoundType[],
  colorMap: Map<string, string>,
  nameMap: Map<string, string>,
): PieDatum[] => {
  const lastRound = completedRounds[completedRounds.length - 1]
  if (!lastRound) return []

  return [...lastRound.competitors]
    .filter(c => !c.deleted && c.grandTotalPoints > 0)
    .sort((a, b) => b.grandTotalPoints - a.grandTotalPoints)
    .map(c => {
      const name = getCompetitorName(c)
      const abbrev = nameMap.get(name) ?? name
      return {
        id: abbrev,
        label: abbrev,
        value: c.grandTotalPoints,
        color: colorMap.get(abbrev),
      }
    })
}

// ---------- CHART 4: Performance Heatmap ----------

export interface HeatMapSerie {
  id: string
  data: { x: string; value: number }[]
}

// Builds heatmap grid: rows = competitors (by final standing), cols = rounds, value = points scored.
export const buildPerformanceHeatmapData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): HeatMapSerie[] => {
  const order = getCompetitorOrder(completedRounds)

  return order.map(({ name }) => ({
    id: nameMap.get(name) ?? name,
    data: completedRounds.map((round, i) => {
      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      return {
        x: `R${i + 1}`,
        value: entry?.points ?? 0,
      }
    }),
  }))
}

// ---------- CHART 5: Points Flow (Stream Chart) ----------

// Builds stream chart data: array of objects per round, each key = competitor name, value = points.
export const buildPointsStreamData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): { keys: string[]; data: Record<string, number>[] } => {
  const order = getCompetitorOrder(completedRounds)
  const keys = order.map(c => nameMap.get(c.name) ?? c.name)

  const data = completedRounds.map(round => {
    const obj: Record<string, number> = {}
    for (const { name } of order) {
      const abbrev = nameMap.get(name) ?? name
      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      obj[abbrev] = entry?.points ?? 0
    }
    return obj
  })

  return { keys, data }
}

// ---------- CHART 6: Win Distribution (Bar Chart) ----------

export interface WinBarDatum {
  [key: string]: string | number
  competitor: string
  wins: number
  runnerUps: number
}

// Counts wins and runner-up finishes per competitor.
export const buildWinDistributionData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): WinBarDatum[] => {
  const winMap = new Map<string, { wins: number; runnerUps: number }>()

  for (const round of completedRounds) {
    if (round.winner?._id) {
      const name = round.winner.name
      const abbrev = nameMap.get(name) ?? name
      const existing = winMap.get(abbrev) ?? { wins: 0, runnerUps: 0 }
      existing.wins++
      winMap.set(abbrev, existing)
    }
    if (round.runnerUp?._id) {
      const name = round.runnerUp.name
      const abbrev = nameMap.get(name) ?? name
      const existing = winMap.get(abbrev) ?? { wins: 0, runnerUps: 0 }
      existing.runnerUps++
      winMap.set(abbrev, existing)
    }
  }

  return [...winMap.entries()]
    .map(([competitor, counts]) => ({
      competitor,
      ...counts,
    }))
    .sort((a, b) => b.wins - a.wins || b.runnerUps - a.runnerUps)
}

// ---------- CHART 7: Driver Popularity (Bar Chart) ----------

export interface DriverPopularityDatum {
  [key: string]: string | number
  driver: string
  picks: number
}

// Counts how many times each driver was bet on across all completed rounds.
export const buildDriverPopularityData = (completedRounds: RoundType[]): DriverPopularityDatum[] => {
  const pickMap = new Map<string, number>()

  for (const round of completedRounds) {
    for (const entry of round.competitors) {
      if (entry.bet?.driverID) {
        const id = entry.bet.driverID
        pickMap.set(id, (pickMap.get(id) ?? 0) + 1)
      }
    }
  }

  return [...pickMap.entries()]
    .map(([driver, picks]) => ({ driver, picks }))
    .sort((a, b) => b.picks - a.picks)
    .slice(0, 10)
}

// ---------- CHART 8: Competitor Profiles (Radar Chart) ----------

export interface RadarDatum {
  stat: string
  [competitorName: string]: string | number
}

// Builds radar data comparing top 4 competitors across 5 dimensions.
export const buildCompetitorRadarData = (
  completedRounds: RoundType[],
  maxPointsPerRound: number,
  nameMap: Map<string, string>,
): RadarDatum[] => {
  const order = getCompetitorOrder(completedRounds)
  const top4 = order.slice(0, 4)
  const roundCount = completedRounds.length

  // Compute stats for each competitor.
  const stats = top4.map(({ name }) => {
    let wins = 0
    let podiums = 0
    let totalPoints = 0
    let bestRoundPoints = 0

    for (const round of completedRounds) {
      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      if (!entry) continue

      if (round.winner?.name === name) wins++
      if (entry.position <= 3) podiums++
      totalPoints += entry.points
      if (entry.points > bestRoundPoints) bestRoundPoints = entry.points
    }

    const winRate = roundCount > 0 ? (wins / roundCount) * 100 : 0
    const consistency = maxPointsPerRound > 0 && roundCount > 0
      ? ((totalPoints / roundCount) / maxPointsPerRound) * 100
      : 0
    const peak = maxPointsPerRound > 0
      ? (bestRoundPoints / maxPointsPerRound) * 100
      : 0
    const podiumRate = roundCount > 0 ? (podiums / roundCount) * 100 : 0

    // Improvement: compare first and last round position.
    const firstEntry = completedRounds[0]?.competitors.find(c => getCompetitorName(c) === name)
    const lastEntry = completedRounds[completedRounds.length - 1]?.competitors.find(c => getCompetitorName(c) === name)
    const competitorCount = completedRounds[0]?.competitors.filter(c => !c.deleted).length ?? 1
    let improvement = 50 // neutral baseline
    if (firstEntry && lastEntry && competitorCount > 1) {
      const positionChange = firstEntry.position - lastEntry.position
      improvement = 50 + (positionChange / (competitorCount - 1)) * 50
    }

    const abbrev = nameMap.get(name) ?? name
    return { name: abbrev, winRate, consistency, peak, podiumRate, improvement }
  })

  // Build radar data format.
  const dimensions = ["Win Rate", "Consistency", "Peak", "Podium Rate", "Improvement"]
  return dimensions.map(dim => {
    const datum: RadarDatum = { stat: dim }
    for (const s of stats) {
      const key = dim === "Win Rate" ? "winRate"
        : dim === "Consistency" ? "consistency"
        : dim === "Peak" ? "peak"
        : dim === "Podium Rate" ? "podiumRate"
        : "improvement"
      datum[s.name] = Math.round(s[key])
    }
    return datum
  })
}

// ---------- CHART 9: Gap to Leader (Line Chart) ----------

// Builds gap-to-leader data: leader line at 0, all others show points behind.
export const buildGapToLeaderData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): LineSerie[] => {
  const order = getCompetitorOrder(completedRounds)

  return order.map(({ name }) => ({
    id: nameMap.get(name) ?? name,
    data: completedRounds.map((round, i) => {
      // Find leader's points this round (position 1).
      const leader = round.competitors.find(c => c.position === 1)
      const leaderPts = leader?.grandTotalPoints ?? 0

      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      const ownPts = entry?.grandTotalPoints ?? 0

      return {
        x: `R${i + 1}`,
        y: leaderPts - ownPts,
      }
    }),
  }))
}

// ---------- CHART 10: Scoring Breakdown (Stacked Bar Chart) ----------

// Builds stacked bar data: each round is a bar, segments are competitor points.
export const buildScoringBreakdownData = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): { keys: string[]; data: Record<string, string | number>[] } => {
  const order = getCompetitorOrder(completedRounds)
  const keys = order.map(c => nameMap.get(c.name) ?? c.name)

  const data = completedRounds.map((round, i) => {
    const obj: Record<string, string | number> = { round: `R${i + 1}` }
    for (const { name } of order) {
      const abbrev = nameMap.get(name) ?? name
      const entry = round.competitors.find(c => getCompetitorName(c) === name)
      obj[abbrev] = entry?.points ?? 0
    }
    return obj
  })

  return { keys, data }
}

// ---------- Helper: Get completed rounds ----------

// Filters rounds to only those with "completed" status.
export const getCompletedRounds = (rounds: RoundType[]): RoundType[] => {
  return rounds.filter(r => r.status === "completed")
}

// Abbreviates a single name to "F. Last" format for compact chart labels.
// Single-word names are returned as-is. Multi-word names use first initial + last word.
const abbreviateName = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return name
  const first = parts[0]
  const last = parts[parts.length - 1]
  return `${first[0].toUpperCase()}. ${last}`
}

// Builds a collision-safe abbreviation map for a set of competitor names.
// Uses "F. Last" format, expanding the first name prefix to resolve duplicates.
export const buildNameAbbreviations = (names: string[]): Map<string, string> => {
  const result = new Map<string, string>()

  // Group names by their initial abbreviation.
  const abbrevToNames = new Map<string, string[]>()
  for (const name of names) {
    const abbrev = abbreviateName(name)
    const group = abbrevToNames.get(abbrev) ?? []
    group.push(name)
    abbrevToNames.set(abbrev, group)
  }

  // Resolve: unique abbreviations go straight in, collisions get expanded prefix.
  for (const [abbrev, group] of abbrevToNames) {
    if (group.length === 1) {
      result.set(group[0], abbrev)
    } else {
      // Expand first name prefix until all are unique.
      for (const fullName of group) {
        const parts = fullName.trim().split(/\s+/)
        const first = parts[0]
        const last = parts[parts.length - 1]
        let prefixLen = 2
        let candidate = `${first.slice(0, prefixLen)}. ${last}`

        // Keep expanding until unique within this collision group.
        while (
          prefixLen < first.length &&
          group.some(other => other !== fullName && expandedAbbrev(other, prefixLen) === candidate)
        ) {
          prefixLen++
          candidate = `${first.slice(0, prefixLen)}. ${last}`
        }
        result.set(fullName, candidate)
      }
    }
  }

  return result
}

// Helper for collision resolution: expand first name to prefixLen chars.
const expandedAbbrev = (name: string, prefixLen: number): string => {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]
  const last = parts[parts.length - 1]
  return `${first.slice(0, prefixLen)}. ${last}`
}

// Type helper for extracting abbreviated competitor names as keys for charts.
export const getCompetitorKeys = (
  completedRounds: RoundType[],
  nameMap: Map<string, string>,
): string[] => {
  return getCompetitorOrder(completedRounds).map(c => nameMap.get(c.name) ?? c.name)
}

