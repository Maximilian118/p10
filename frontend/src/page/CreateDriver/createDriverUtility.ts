import { driverType, teamType } from "../../shared/types"
import { userType } from "../../shared/localStorage"
import { createdByID } from "../../shared/utility"
import { createDriverFormType } from "./CreateDriver"
import moment from "moment"

// Generates a 1-3 letter driver ID from the last word of the name.
// Extracts only letters from the last word. Returns empty if no letters found.
export const generateDriverID = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return ""

  const words = trimmed.split(/\s+/)
  const lastWord = words[words.length - 1]

  // Extract only letters from the last word.
  const lettersOnly = lastWord.replace(/[^a-zA-Z]/g, "")
  if (!lettersOnly) return ""

  return lettersOnly.slice(0, 3).toUpperCase()
}

// Determine user's edit permissions for a driver.
// Returns "delete" if user can delete, "edit" if user can only edit, "" if no permissions.
// Official drivers can only be modified by admins.
export const canEditDriver = (
  editingDriver: driverType | null | undefined,
  user: userType
): "delete" | "edit" | "" => {
  if (!editingDriver) return "edit"
  // Official check - only admins can modify.
  if (editingDriver.official && !user.permissions.admin) return ""
  const noTeams = editingDriver.teams.length === 0
  const creator = createdByID(editingDriver.created_by) === user._id
  const authority = user.permissions.adjudicator || creator
  if (user.permissions.admin) return "delete"
  if (authority && noTeams) return "delete"
  if (authority) return "edit"
  return ""
}

// Check if form has changed from original driver values.
export const hasDriverFormChanged = (
  editingDriver: driverType | null | undefined,
  form: createDriverFormType
): boolean => {
  if (!editingDriver) return true

  const teamsMatch =
    editingDriver.teams.length === form.teams.length &&
    editingDriver.teams.every((t: teamType) => form.teams.some((ft: teamType) => ft._id === t._id))

  return (
    !!form.icon ||
    !!form.body ||
    editingDriver.name !== form.driverName ||
    editingDriver.driverID !== form.driverID ||
    !teamsMatch ||
    editingDriver.stats.nationality !== form.nationality?.label ||
    `${editingDriver.stats.heightCM}cm` !== form.heightCM ||
    `${editingDriver.stats.weightKG}kg` !== form.weightKG ||
    !moment(editingDriver.stats.birthday).isSame(form.birthday, "day") ||
    editingDriver.stats.moustache !== form.moustache ||
    editingDriver.stats.mullet !== form.mullet
  )
}
