// Get the initials of the user.
import { userType } from "./localStorage"
import { Location } from "react-router-dom"
import {
  CompetitorEntryType,
  RoundType,
  DriverEntryType,
  TeamEntryType,
  seriesType,
  teamType,
  driverType,
  userType as fullUserType,
} from "./types"

// Returns the backend API URL based on current browser location.
// Allows frontend to auto-detect backend address for LAN access.
export const getApiUrl = (): string => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = 3001
  return `${protocol}//${hostname}:${port}`
}

// If just one word return one initial, if two return two.
export const getInitials = (userName: string) => {
  if (!userName) {
    return "?"
  }

  const names = userName.split(" ")
  let initials = names[0].substring(0, 1).toUpperCase()

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase()
  }

  return initials
}

// Return a string reflecting the current permissions level of a user.
export const getPermLevel = (user: userType): string => {
  const perms = user.permissions
  const keys = Object.keys(perms)
  const res = keys.filter((key) => perms[key] === true)

  if (res.length > 0) {
    return res[0]
  }

  return "Competitor"
}

// Return a string reflecting the permissions level from a permissions object.
export const getPermLevelFromPermissions = (permissions: {
  admin: boolean
  adjudicator: boolean
  guest: boolean
}): string => {
  const keys = Object.keys(permissions) as (keyof typeof permissions)[]
  const res = keys.filter((key) => permissions[key] === true)

  if (res.length > 0) {
    return res[0]
  }

  return "Competitor"
}

// Make the window size inclusive of mobile browser ui.
export const resizeOps = () => {
  document.documentElement.style.setProperty("--vh", window.innerHeight * 0.01 + "px")
}

// Preload form images.
// load the img for the current enpoint first and then preload the rest.
export const preloadFormImgs = (location: Location<unknown>): void => {
  const imgs = [
    {
      url: "https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-car1.jpg",
      endpoint: "/login",
    },
    {
      url: "https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-car2.jpeg",
      endpoint: "/",
    },
    {
      url: "https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-engine1.jpeg",
      endpoint: "/create",
    },
    {
      url: "https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-engine3.jpeg",
      endpoint: "/forgot",
    },
  ]

  const img = imgs.find((img) => img.endpoint === location.pathname)

  if (img) {
    new Image().src = img.url
  }

  const newImgs = imgs.filter((obj) => obj.endpoint !== location.pathname)
  newImgs.forEach((img) => (new Image().src = img.url))
}

export const heightCMOptions = (): string[] => {
  const opt = []

  for (let i = 130; i <= 220; i++) {
    opt.push(`${i}cm`)
  }

  return opt
}

export const weightKGOptions = (): string[] => {
  const opt = []

  for (let i = 40; i <= 120; i++) {
    opt.push(`${i}kg`)
  }

  return opt
}

// Check that a string has 1-3 uppercase letters only (A-Z).
export const isValidDriverID = (str: string): boolean => {
  return /^[A-Z]{1,3}$/.test(str)
}

// Legacy alias for backwards compatibility.
export const isThreeLettersUppercase = isValidDriverID

// Retrieve the ID of the user from created_by fields.
export const createdByID = (created_by?: userType | string): string => {
  if (!created_by) {
    return ""
  }

  if (typeof created_by === "string") {
    return created_by
  } else {
    return created_by._id
  }
}

// Remove everything but numbers from a string.
export const onlyNumbers = (str: string): number => Number(str.replace(/\D/g, ""))
// Sort an array of objects with name key of type string (filters out items without name).
export const sortAlphabetically = <T extends { name?: string }>(arr: T[]): T[] => {
  return arr
    .filter((item): item is T & { name: string } => !!item.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}
// Capatalise the first letter in a string.
export const capitalise = (s: string) => (s && s[0].toUpperCase() + s.slice(1)) || ""

// Get competitors from a specific round, sorted by grandTotalPoints (highest first).
export const getCompetitorsFromRound = (round: RoundType): CompetitorEntryType[] => {
  if (!round?.competitors) return []
  return [...round.competitors].sort((a, b) => b.grandTotalPoints - a.grandTotalPoints)
}

// Get drivers from a specific round, sorted by position (1st place first).
export const getDriversFromRound = (round: RoundType): DriverEntryType[] => {
  if (!round?.drivers) return []
  return [...round.drivers].sort((a, b) => a.position - b.position)
}

// Get teams from a specific round, sorted by position (1st place first).
export const getTeamsFromRound = (round: RoundType): TeamEntryType[] => {
  if (!round?.teams) return []
  return [...round.teams].sort((a, b) => a.position - b.position)
}

// Get all drivers from series, with entry data if available in round.
// Uses String() conversion for ID comparison to handle ObjectId vs string type mismatches.
// Returns drivers sorted by their season standing (positionDrivers) for display.
export const getAllDriversForRound = (series: seriesType, round: RoundType): DriverEntryType[] => {
  const entryMap = new Map(round.drivers?.map((d) => [String(d.driver._id), d]) || [])

  return series.drivers
    .map((driver) => {
      const existing = entryMap.get(String(driver._id))
      if (existing) {
        // Use driver from series (has teams populated) with entry data from round.
        return { ...existing, driver }
      }
      // Create default entry with 0 points for drivers not in the round.
      return {
        driver,
        points: 0,
        totalPoints: 0,
        grandTotalPoints: 0,
        position: 0,
        positionDrivers: series.drivers.length, // New drivers start at the end.
        positionActual: 0,
      }
    })
    // Sort by backend-calculated season standing (positionDrivers), then alphabetically as tiebreaker.
    .sort((a, b) => a.positionDrivers - b.positionDrivers || a.driver.name.localeCompare(b.driver.name))
}

// Returns podium class for coloring based on position.
export const getPodiumClass = (position: number): string => {
  if (position === 1) return "gold"
  if (position === 2) return "silver"
  if (position === 3) return "bronze"
  return ""
}

// Converts a hex color string to RGB values.
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const sanitized = hex.replace("#", "")
  return {
    r: parseInt(sanitized.slice(0, 2), 16),
    g: parseInt(sanitized.slice(2, 4), 16),
    b: parseInt(sanitized.slice(4, 6), 16),
  }
}

// Calculates relative luminance per WCAG 2.0 guidelines.
// Uses sRGB to linear RGB conversion before applying luminance coefficients.
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const normalized = c / 255
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Determines whether black or white text provides better contrast against a given background color.
export const getContrastTextColor = (hexColor: string): "black" | "white" => {
  const { r, g, b } = hexToRgb(hexColor)
  const luminance = getRelativeLuminance(r, g, b)
  return luminance > 0.5 ? "black" : "white"
}

// Get all unique teams from series drivers, with entry data if available.
// Uses String() conversion for ID comparison to handle ObjectId vs string type mismatches.
// Get all unique teams from series drivers, with entry data if available.
// Uses String() conversion for ID comparison to handle ObjectId vs string type mismatches.
// Returns teams sorted by their season standing (positionConstructors) for display.
export const getAllTeamsForRound = (series: seriesType, round: RoundType): TeamEntryType[] => {
  const entryMap = new Map(round.teams?.map((t) => [String(t.team._id), t]) || [])

  // Collect unique teams and their drivers from series data.
  const teamsMap = new Map<string, teamType>()
  const teamDriversMap = new Map<string, driverType[]>()

  series.drivers.forEach((driver) => {
    driver.teams.forEach((team) => {
      if (team._id) {
        if (!teamsMap.has(team._id)) {
          teamsMap.set(team._id, team)
          teamDriversMap.set(team._id, [])
        }
        // Add this driver to the team's drivers list.
        teamDriversMap.get(team._id)!.push(driver)
      }
    })
  })

  const totalTeams = teamsMap.size

  return Array.from(teamsMap.values())
    .map((team) => {
      const existing = entryMap.get(String(team._id))
      // Build team with drivers populated from series data.
      const teamWithDrivers = {
        ...team,
        drivers: teamDriversMap.get(team._id!) || [],
      }
      if (existing) {
        return {
          ...existing,
          team: teamWithDrivers,
        }
      }
      // Create default entry with 0 points for teams not in the round.
      return {
        team: teamWithDrivers,
        drivers: teamDriversMap.get(team._id!) || [],
        points: 0,
        totalPoints: 0,
        grandTotalPoints: 0,
        position: 0,
        positionConstructors: totalTeams, // New teams start at the end.
      }
    })
    // Sort by backend-calculated season standing (positionConstructors), then alphabetically as tiebreaker.
    .sort((a, b) => a.positionConstructors - b.positionConstructors || a.team.name.localeCompare(b.team.name))
}

// Collects all unique competitor IDs that have participated in any round.
export const getAllRoundCompetitorIds = (rounds: RoundType[]): Set<string> => {
  const ids = new Set<string>()
  rounds.forEach((round) => {
    round.competitors?.forEach((c) => {
      if (c.competitor?._id) {
        ids.add(c.competitor._id)
      }
    })
  })
  return ids
}

// Checks if a competitor is inactive (not in champ.competitors array, banned, or kicked).
export const isCompetitorInactive = (
  competitorId: string,
  champCompetitors: fullUserType[],
  banned: fullUserType[],
  kicked: fullUserType[] = [],
): boolean => {
  const inCompetitors = champCompetitors.some((c) => c._id === competitorId)
  const isBanned = banned?.some((b) => b._id === competitorId)
  const isKicked = kicked?.some((k) => k._id === competitorId)
  return !inCompetitors || isBanned || isKicked
}

// Aggregates all competitors from all rounds into a single array with their latest data.
// Returns competitors sorted by their last known position, including inactive ones.
export const aggregateAllCompetitors = (
  rounds: RoundType[],
  champCompetitors: fullUserType[],
  banned: fullUserType[],
  kicked: fullUserType[] = [],
): (CompetitorEntryType & { isInactive: boolean; isBanned: boolean; isKicked: boolean })[] => {
  // Build a map of competitor ID to their latest entry data.
  const competitorMap = new Map<string, CompetitorEntryType>()

  // Only consider completed rounds where totalPoints has been calculated.
  const completedRounds = rounds.filter(r => r.status === "completed" || r.status === "results")

  // Iterate through completed rounds to collect competitor data.
  completedRounds.forEach((round) => {
    round.competitors?.forEach((entry) => {
      if (entry.competitor?._id) {
        // Always update with the latest completed round data.
        competitorMap.set(entry.competitor._id, entry)
      }
    })
  })

  // Convert to array and add inactive/banned/kicked status.
  const competitors = Array.from(competitorMap.values()).map((entry) => {
    const isBanned = banned?.some((b) => b._id === entry.competitor._id) ?? false
    const isKicked = kicked?.some((k) => k._id === entry.competitor._id) ?? false
    const inCompetitors = champCompetitors.some((c) => c._id === entry.competitor._id)
    return {
      ...entry,
      isInactive: !inCompetitors || isBanned || isKicked,
      isBanned,
      isKicked,
    }
  })

  // Sort by grandTotalPoints (active competitors first, then by points highest first).
  return competitors.sort((a, b) => {
    // Active competitors come before inactive.
    if (a.isInactive !== b.isInactive) {
      return a.isInactive ? 1 : -1
    }
    // Then sort by grandTotalPoints (highest first).
    return b.grandTotalPoints - a.grandTotalPoints
  })
}
