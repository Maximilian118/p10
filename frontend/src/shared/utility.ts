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

// Get competitors from a specific round, sorted by position (1st place first).
export const getCompetitorsFromRound = (round: RoundType): CompetitorEntryType[] => {
  if (!round?.competitors) return []
  return [...round.competitors].sort((a, b) => a.position - b.position)
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
export const getAllDriversForRound = (series: seriesType, round: RoundType): DriverEntryType[] => {
  const entryMap = new Map(round.drivers?.map((d) => [String(d.driver._id), d]) || [])

  const sorted = series.drivers
    .map((driver) => {
      const existing = entryMap.get(String(driver._id))
      if (existing) {
        // Use driver from series (has teams populated) with entry data from round.
        return { ...existing, driver }
      }
      // Create default entry with 0 points.
      return {
        driver,
        points: 0,
        totalPoints: 0,
        position: 0,
        positionDrivers: 0,
        positionActual: 0,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || a.driver.name.localeCompare(b.driver.name))

  // Assign positions based on sorted order.
  return sorted.map((entry, i) => ({ ...entry, position: i + 1 }))
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

  const sorted = Array.from(teamsMap.values())
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
      // Create default entry with 0 points.
      return {
        team: teamWithDrivers,
        drivers: teamDriversMap.get(team._id!) || [],
        points: 0,
        totalPoints: 0,
        position: 0,
        positionConstructors: 0,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || a.team.name.localeCompare(b.team.name))

  // Assign positions based on sorted order.
  return sorted.map((entry, i) => ({ ...entry, position: i + 1 }))
}
