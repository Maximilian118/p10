import moment from "moment"
import { teamType } from "../../../../shared/types"
import { teamEditFormErrType, teamEditFormType } from "./TeamEdit"
import { userType } from "../../../../shared/localStorage"
import { createdByID } from "../../../../shared/utility"

export const teamEditErrors = (
  editForm: teamEditFormType,
  setEditFormErr: React.Dispatch<React.SetStateAction<teamEditFormErrType>>,
  teams: teamType[],
  update?: boolean,
): boolean => {
  const errors: teamEditFormErrType = {
    teamName: "",
    inceptionDate: "",
    nationality: "",
    dropzone: "",
  }

  if (!editForm.teamName) {
    errors.teamName = "Please enter a name."
  }

  if (!editForm.nationality) {
    errors.nationality = "Please enter a nationality."
  }

  if (!editForm.inceptionDate) {
    errors.inceptionDate = "Please enter a date."
  } else if (moment(editForm.inceptionDate).isAfter(moment())) {
    errors.inceptionDate = "Date can not be in the future dummy."
  }

  if (!editForm.icon && !update) {
    errors.dropzone = "Please enter an image."
  }
  // Remove the team with this editForm._id from the teams array for duplicate checking.
  const newTeams = teams.filter((t) => t._id !== editForm._id)
  // Loop through all of the existing teams.
  for (const team of newTeams) {
    // If teamName already exists in teams array.
    if (team.name.toLowerCase() === editForm.teamName.toLowerCase()) {
      errors.teamName = "A team by that name already exists!"
    }

    if (update && team._id === editForm._id) {
      // If nothing has changed
      if (
        team.name === editForm.teamName &&
        team.stats.nationality === editForm.nationality?.label &&
        team.stats.inceptionDate === moment(editForm.inceptionDate).format() &&
        !editForm.icon
      ) {
        errors.teamName = "No changes have been made."
      }
    }
  }

  setEditFormErr((prevErrs) => {
    return {
      ...prevErrs,
      ...errors,
    }
  })

  return Object.values(errors).some((error) => error !== "")
}

export const teamDeleteErrors = (
  team: teamType,
  setEditFormErr: React.Dispatch<React.SetStateAction<teamEditFormErrType>>,
): boolean => {
  const errors: teamEditFormErrType = {
    teamName: "",
    inceptionDate: "",
    nationality: "",
    dropzone: "",
  }

  if (team.drivers.length > 0) {
    errors.teamName = "This team still has drivers."
  }

  setEditFormErr((prevErrs) => {
    return {
      ...prevErrs,
      ...errors,
    }
  })

  return Object.values(errors).some((error) => error !== "")
}

// Determine what privilages the user has to edit this team.
export const canEditTeam = (team: teamType, user: userType): "delete" | "edit" | "" => {
  const noDrivers = team.drivers.length === 0
  const creator = createdByID(team.created_by) === user._id
  const authority = user.permissions.adjudicator || creator
  // If user is admin, can do anything.
  if (user.permissions.admin) {
    return "delete"
  }
  // If user is an adjudicator or user created the team and
  // the team has no drivers assigned to it, can delete.
  if (authority && noDrivers) {
    return "delete"
  }
  // If user has the authority to do so, can edit the team.
  if (authority) {
    return "edit"
  }
  // If user meets none of the criteria, cannot do anything.
  return ""
}
