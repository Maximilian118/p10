import { GraphQLError } from "graphql"
import User, { userType } from "../../models/user"
import Badge, { badgeType } from "../../models/badge"
import Champ from "../../models/champ"
import { ObjectId } from "mongodb"
import badgeRewardOutcomes, { findDesc, findDescs, findHows } from "../../shared/badgeOutcomes"
import Team from "../../models/team"
import Driver, { driverType } from "../../models/driver"
import { isThreeLettersUppercase } from "../../shared/utility"
import Series from "../../models/series"

export type punctuation = `${string}.` | `${string}!` | `${string}?`

// Sanitizes sensitive data from objects before including in error responses.
const sanitizeValue = (value: unknown): unknown => {
  if (value && typeof value === "object") {
    // Handle objects that may contain sensitive fields.
    const sensitiveFields = ["password", "refreshToken", "accessToken"]
    const obj = value as Record<string, unknown>

    // Check if object has any sensitive fields.
    const hasSensitiveData = sensitiveFields.some((field) => field in obj)
    if (hasSensitiveData) {
      const sanitized: Record<string, unknown> = {}
      for (const key in obj) {
        if (!sensitiveFields.includes(key)) {
          sanitized[key] = obj[key]
        }
      }
      return sanitized
    }
  }
  return value
}

export const throwError = (
  type: string,
  value: unknown,
  message: punctuation,
  code?: number,
): never => {
  throw new GraphQLError(
    JSON.stringify({
      type,
      value: sanitizeValue(value),
      message,
      code: code ?? 400,
    }),
  )
}

export const createdByErrors = async (
  req_id: string | undefined,
  created_by: ObjectId,
): Promise<void> => {
  const type = "name"
  const user = await User.findById(created_by)

  if (!user) {
    throwError(type, created_by, "No user by that ID was found...")
  }

  if (req_id !== user?._doc._id.toString()) {
    throwError(type, created_by, "You are not the same person as the creator... Imposter!")
  }
}

export const nameErrors = async (name: string, user?: userType): Promise<void> => {
  const type = "name"

  if (!name) {
    throwError(type, name, "Please enter a name.")
  }

  if (!/^[a-zA-Z\s.'-]{1,30}$/.test(name)) {
    if (name.length > 30) {
      throwError(type, name, "30 characters maximum.")
    }

    throwError(type, name, "No numbers or special characters.")
  }

  if (user && name === user.name) {
    throwError(type, name, "This is already your name.")
  }
}

export const nameCanNumbersErrors = (type: string, name: string): void => {
  if (!name) {
    throwError(type, name, "Please enter a name.")
  }

  if (!/^[a-zA-Z0-9\s]{1,50}$/.test(name)) {
    if (name.length > 50) {
      throwError(type, name, "50 characters maximum.")
    }

    throwError(type, name, "No special characters.")
  }
}

export const emailErrors = async (email: string, user?: userType): Promise<void> => {
  const type = "email"

  if (!email) {
    throwError(type, email, "Please enter an email.")
  }

  if (!/^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/.test(email)) {
    throwError(type, email, "Please enter a valid email address.")
  }

  if (user) {
    if (email === user.email) {
      throwError(type, email, "This is already your email address.")
    }
  }

  if (await User.findOne({ email })) {
    // Generic error message to prevent user enumeration attacks.
    throwError(type, email, "Unable to create account with this email.")
  }
}

export const passwordErrors = (password: string | null, passConfirm: string): void => {
  const type = "password"

  if (!password) {
    throwError(type, password, "Please enter a password.")
  } else {
    if (password.length <= 8) {
      throwError(type, password, "Minimum 8 characters.")
    }

    if (password.length >= 99) {
      throwError(type, password, "Maximum 99 characters.")
    }

    if (!/^(?=.*\d)(?=.*[a-zA-Z])[a-zA-Z\d!?_<>"'$£%^&(){};:+=*#\\-]{8,99}$/.test(password)) {
      throwError(type, password, "At least one letter and one number.")
    }

    if (password !== passConfirm) {
      throwError(type, password, "Passwords do not match.")
    }
  }
}

export const passConfirmErrors = (passConfirm: string, password: string | null): void => {
  const type = "passConfirm"

  if (!passConfirm) {
    throwError(type, password, "Please enter your password confirmation.")
  }

  if (passConfirm !== password) {
    throwError(type, password, "Passwords do not match.")
  }
}

// Validates icon URL - required for user creation.
export const iconErrors = (
  icon: string | undefined,
  profile_picture: string | undefined,
  user?: userType,
): void => {
  const type = "dropzone"

  // Icon is required for user creation (when no user is passed).
  if (!user && !icon) {
    throwError(type, icon, "A profile picture is required.")
  }

  if (icon) {
    if (
      !/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/icon\/[a-z0-9-]+$/i.test(icon) // prettier-ignore
    ) {
      throwError(type, icon, "Icon URL is not valid... Tricky one.")
    }
  }

  if (icon && !profile_picture) {
    throwError(type, icon, "Got Icon but no Profile Picture?!")
  }

  if (icon && user) {
    if (icon === user.icon) {
      throwError(type, icon, "Duplicate Icon.")
    }
  }
}

// Validates profile picture URL - required for user creation.
export const profilePictureErrors = (
  profile_picture: string | undefined,
  icon: string | undefined,
  user?: userType,
): void => {
  const type = "dropzone"

  // Profile picture is required for user creation (when no user is passed).
  if (!user && !profile_picture) {
    throwError(type, profile_picture, "A profile picture is required.")
  }

  if (profile_picture) {
    if (
      !/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/profile-picture\/[a-z0-9-]+$/i.test(profile_picture) // prettier-ignore
    ) {
      throwError(type, profile_picture, "Profile Picture URL is not valid... Tricky one.")
    }
  }

  if (profile_picture && !icon) {
    throwError(type, icon, "Got Profile Picture but no Icon?!")
  }

  if (profile_picture && user) {
    if (profile_picture === user.profile_picture) {
      throwError(type, profile_picture, "Duplicate Profile Picture.")
    }
  }
}

export const imageErrors = (url: string): void => {
  const type = "dropzone"

  if (!url) {
    throwError(type, url, "An image is required.")
  }

  if (!/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/(icon|profile-picture|body)\/[a-z0-9-]+$/i.test(url)) {
    throwError(type, url, "Image url is not valid... Tricky one.")
  }
}

// Validates driver image fields (icon, profile_picture required; body optional).
export const driverImageErrors = (
  icon: string,
  profile_picture: string,
  body?: string | null,
): void => {
  const type = "dropzone"

  // Icon is required.
  if (!icon) {
    throwError(type, icon, "A headshot icon is required.")
  }

  if (!/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/icon\/[a-z0-9-]+$/i.test(icon)) {
    throwError(type, icon, "Icon URL is not valid... Tricky one.")
  }

  // Profile picture is required.
  if (!profile_picture) {
    throwError(type, profile_picture, "A headshot profile picture is required.")
  }

  if (!/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/profile-picture\/[a-z0-9-]+$/i.test(profile_picture)) {
    throwError(type, profile_picture, "Profile picture URL is not valid... Tricky one.")
  }

  // Body is optional, but validate format if provided.
  if (body && !/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/body\/[a-z0-9-]+$/i.test(body)) {
    throwError("dropzoneBody", body, "Body URL is not valid... Tricky one.")
  }
}

// Validates team image fields (icon and emblem required).
export const teamImageErrors = (
  icon: string,
  emblem: string,
): void => {
  const type = "dropzone"

  // Icon is required.
  if (!icon) {
    throwError(type, icon, "A team icon is required.")
  }

  if (!/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/icon\/[a-z0-9-]+$/i.test(icon)) {
    throwError(type, icon, "Icon URL is not valid... Tricky one.")
  }

  // Emblem is required.
  if (!emblem) {
    throwError(type, emblem, "A team emblem is required.")
  }

  if (!/^http:\/\/[a-z0-9-.]+\/[a-z0-9-]+\/[a-z0-9-]+\/emblem\/[a-z0-9-]+$/i.test(emblem)) {
    throwError(type, emblem, "Emblem URL is not valid... Tricky one.")
  }
}

export const imageUploadErrors = (filename: string): void => {
  const type = "dropzone"

  if (!filename) {
    throwError(type, filename, "No file name has been passed.")
  }

  // Validates S3 path format: entityType/entityName/category/filename
  if (!/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(filename)) {
    throwError(type, filename, "Image file name is not valid.")
  }
}

export const userErrors = (user?: userType): void => {
  const type = "email"

  if (!user) {
    throwError(type, user, "Account not found!")
  }
}

export const badgeNameErrors = (badgeName: string): void => {
  const type = "badgeName"

  if (!badgeName) {
    throwError(type, badgeName, "Please enter a name.")
  }

  if (badgeName.length >= 30) {
    throwError(type, badgeName, "30 characters maximum.")
  }
}

// Validate optional customName field (only if provided).
export const badgeCustomNameErrors = (customName: string | undefined): void => {
  if (customName && customName.length >= 30) {
    throwError("customName", customName, "30 characters maximum.")
  }
}

export const badgeChampErrors = (championship: ObjectId | null): void => {
  const type = "badge"

  if (!championship) {
    throwError(type, championship, "You must pass a championship _id.")
  }
}

export const badgeURLErrors = (url: string): void => {
  const type = "badge"

  if (!url) {
    throwError(type, url, "You must pass an image URL.")
  }
}

export const badgeAwardedHowErrors = (awardedHow: string): void => {
  const type = "badge"

  if (!awardedHow) {
    throwError(type, awardedHow, "Please enter how this badge should be earned.")
  }

  if (findHows(badgeRewardOutcomes, awardedHow).length === 0) {
    throwError(type, awardedHow, "The passed 'awarded for' outcome does not exist. Curious...")
  }
}

export const badgeAwardedDescErrors = (awardedHow: string, awardedDesc: string): void => {
  const type = "badge"

  if (!awardedHow) {
    throwError(type, awardedHow, "Please enter how this badge should be earned.")
  }

  if (findHows(badgeRewardOutcomes, awardedHow).length === 0) {
    throwError(type, awardedHow, "The passed 'awarded for' outcome does not exist. Curious...")
  }

  if (!awardedDesc) {
    throwError(type, awardedDesc, "Please describe how this badge should be earned.")
  }

  if (findDescs(badgeRewardOutcomes, awardedDesc).length === 0) {
    throwError(
      type,
      awardedHow,
      "The passed 'awarded for' outcome description does not exist. Curious...",
    )
  }
}

export const badgeRarityErrors = (rarity: number): void => {
  const type = "badge"

  if (rarity === null || typeof rarity === "undefined") {
    throwError(type, rarity, "Please enter a rarity for the badge.")
  }

  if (typeof rarity !== "number") {
    throwError(type, rarity, "Rarity must be a number.")
  }
}

export const badgeZoomErrors = (zoom: number): void => {
  const type = "badge"

  if (zoom === null || typeof zoom === "undefined") {
    throwError(type, zoom, "Please enter a zoom level for the badge.")
  }

  if (typeof zoom !== "number") {
    throwError(type, zoom, "Zoom must be a number.")
  }
}

export const badgeDuplicateErrors = async (badge: badgeType): Promise<void> => {
  const type = "badge"

  // Find badges by championship value.
  const dbBadges = await Badge.find({ championship: badge.championship }).exec()
  // Remove the targeted badge from the array.
  const badges = dbBadges.filter((b: badgeType) => b._id === badge._id)
  // Loop through all of the badges in the DB for this championship and check if the badge has any duplicate values.
  badges.forEach((b: badgeType) => {
    if (b.name.toLowerCase() === badge.name.toLowerCase()) {
      throwError(type, badge, "A badge of that name already exists for this championship.")
    }

    if (b.url === badge.url) {
      throwError(type, badge, "A badge with that URL already exists for this championship.")
    }
    // prettier-ignore
    if (b.awardedHow === badge.awardedHow) {
      throwError(type, badge, "A badge with that 'Awarded for' already exists for this championship.")
    }

    if (b.awardedDesc === badge.awardedDesc) {
      throwError(type, badge, "A badge with that description already exists for this championship.")
    }
    // prettier-ignore
    if (findDesc(badgeRewardOutcomes, badge.awardedHow) !== badge.awardedDesc) {
      throwError(type, badge, "The description provided does not match the selected 'Awarded for' field. Curious... Very curious...")
    }
  })
}

export const teamNameErrors = async (name: string): Promise<void> => {
  const type = "teamName"

  if (!name) {
    throwError(type, name, "The team must have a name!")
  }

  // Validate format: alphanumeric + space only, max 50 chars (matches frontend).
  if (!/^[a-zA-Z0-9\s]{1,50}$/.test(name)) {
    if (name.length > 50) {
      throwError(type, name, "Maximum length 50 characters.")
    }

    throwError(type, name, "No special characters.")
  }

  // Find a team by the passed name.
  if (await Team.findOne({ name: { $regex: `^${name}$`, $options: "i" } })) {
    // FindOne case-insensitive.
    throwError(type, name, "A team by that name already exists!")
  }
}

export const driverNameErrors = async (name: string): Promise<void> => {
  const type = "driverName"

  if (!name) {
    throwError(type, name, "The driver must have a name!")
  }

  // Validate format: letters, spaces, hyphens, apostrophes, periods. Max 30 chars (matches frontend).
  if (!/^[a-zA-Z\s\-'.]{1,30}$/.test(name)) {
    if (name.length > 30) {
      throwError(type, name, "Maximum length 30 characters.")
    }

    throwError(type, name, "No numbers or special characters.")
  }

  // Find a driver by the passed name.
  if (await Driver.findOne({ name: { $regex: `^${name}$`, $options: "i" } })) {
    // FindOne case-insensitive.
    throwError(type, name, "A driver by that name already exists!")
  }
}

export const seriesNameErrors = async (name: string): Promise<void> => {
  const type = "seriesName"

  if (!name) {
    throwError(type, name, "The series must have a name!")
  }

  // Validate format: alphanumeric + space only, max 50 chars (matches frontend).
  if (!/^[a-zA-Z0-9\s]{1,50}$/.test(name)) {
    if (name.length > 50) {
      throwError(type, name, "Maximum length 50 characters.")
    }

    throwError(type, name, "No special characters.")
  }

  // Find a series by the passed name.
  if (await Series.findOne({ name: { $regex: `^${name}$`, $options: "i" } })) {
    // FindOne case-insensitive.
    throwError(type, name, "A series by that name already exists!")
  }
}

export const driverIDErrors = (driverID: string): void => {
  const type = "driverID"

  if (!driverID) {
    throwError(type, driverID, "Please enter a driverID.")
  }

  if (!isThreeLettersUppercase(driverID)) {
    throwError(type, driverID, "Must be 1-3 uppercase letters (A-Z).")
  }
}

export const driversErrors = (drivers: ObjectId[]) => {
  const type = "drivers"

  if (drivers.length < 2) {
    throwError(type, drivers, "2 or more drivers are required.")
  }
}

export const hasChampErrors = (type: string, championships: ObjectId[]) => {
  if (championships.length > 0) {
    throwError(type, championships, `${type} still belongs to some championships.`)
  }
}

// Take an object of values passed into a request and loop through it
// for a quick check that none of the values are falsy.
export const falsyValErrors = <T>(inputObject: T): void => {
  for (const key in inputObject) {
    if (!inputObject[key] && typeof inputObject[key] !== "boolean") {
      throwError(key, inputObject, `${key} must be populated.`)
    }
  }
}

// Validates championship name - must be unique globally and valid format.
export const champNameErrors = async (name: string): Promise<void> => {
  const type = "champName"

  if (!name) {
    throwError(type, name, "Please enter a championship name.")
  }

  // Validate format: alphanumeric + space only, max 50 chars (matches frontend).
  if (!/^[a-zA-Z0-9\s]{1,50}$/.test(name)) {
    if (name.length > 50) {
      throwError(type, name, "Maximum length 50 characters.")
    }

    throwError(type, name, "No special characters.")
  }

  // Check if championship name already exists (globally unique).
  const existingChamp = await Champ.findOne({ name: { $regex: `^${name}$`, $options: "i" } })

  if (existingChamp) {
    throwError(type, name, "A championship by that name already exists!")
  }
}

// Check if a driver is part of any championship (via series or bets).
export const driverInChampErrors = async (driver: driverType): Promise<void> => {
  const type = "driverName"

  // Check if any of the driver's series are linked to championships.
  for (const seriesId of driver.series) {
    const seriesDoc = await Series.findById(seriesId)
    if (seriesDoc && seriesDoc.championships.length > 0) {
      throwError(type, driver, "This driver belongs to a series used by a championship.")
    }
  }

  // Check if driver is referenced in any championship round as a bet or winner.
  const champWithBet = await Champ.findOne({
    $or: [{ "rounds.competitors.bet": driver._id }, { "rounds.winner": driver._id }],
  })
  if (champWithBet) {
    throwError(type, driver, "This driver has been used in championship bets.")
  }
}
