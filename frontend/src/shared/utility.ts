// Get the initials of the user.
import { userType } from "./localStorage"
import { Location } from "react-router-dom"

// If just one word return one initial, if two return two.
export const getInitials = (userName: string) => {
  if (!userName) {
    return "?"
  }

  let names = userName.split(" ")
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
export const getPermLevelFromPermissions = (permissions: { admin: boolean; adjudicator: boolean; guest: boolean }): string => {
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
export const preloadFormImgs = (location: Location<any>): void => {
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

// Check that a string has only three letters and all letters are uppercase.
export const isThreeLettersUppercase = (
  str: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}`,
) => {
  // Check if the length of the string is exactly 3
  if (str.length !== 3) {
    return false
  }

  // Check if all the characters in the string are uppercase
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== str[i].toUpperCase()) {
      return false
    }
  }

  return true
}

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
// Sort an array of objects with name key of type string.
export const sortAlphabetically = <T extends { name: string }[]>(arr: T) => arr.sort((a, b) => a.name.localeCompare(b.name)) // prettier-ignore
// Capatalise the first letter in a string.
export const capitalise = (s: string) => (s && s[0].toUpperCase() + s.slice(1)) || ""
