import moment from "moment"
import { driverEditFormErrType, driverEditFormType } from "./DriverEdit"
import { driverType } from "../../../../shared/types"
import { createdByID, isThreeLettersUppercase } from "../../../../shared/utility"
import { userType } from "../../../../shared/localStorage"

export const driverEditErrors = (
  editForm: driverEditFormType,
  setEditFormErr: React.Dispatch<React.SetStateAction<driverEditFormErrType>>,
  drivers: driverType[],
  update?: boolean,
): boolean => {
  const errors: driverEditFormErrType = {
    driverName: "",
    driverID: "",
    teams: "",
    nationality: "",
    heightCM: "",
    weightKG: "",
    birthday: "",
    moustache: "",
    mullet: "",
    dropzone: "",
    dropzoneBody: "",
  }

  if (!editForm.icon && !update) {
    errors.dropzone = "Please enter a headshot image."
  }

  if (!editForm.driverName) {
    errors.driverName = "Please enter a name."
  }

  if (!editForm.driverID) {
    errors.driverID = "Please enter a name."
  } else if (!isThreeLettersUppercase(editForm.driverID)) {
    errors.driverID = "Must be three uppercase letters."
  }

  if (!editForm.nationality) {
    errors.nationality = "Please enter a nationality."
  }

  if (!editForm.heightCM) {
    errors.heightCM = "Please enter a height."
  }

  if (!editForm.weightKG) {
    errors.weightKG = "Please enter a weight."
  }

  if (!editForm.birthday) {
    errors.birthday = "Please enter a date."
  } else if (moment(editForm.birthday).isAfter(moment())) {
    errors.birthday = "Date can not be in the future dummy."
  }
  // Remove the driver with this editForm._id from the drivers array for duplicate checking.
  const newDrivers = drivers.filter((d) => d._id !== editForm._id)
  // Loop through all of the existing drivers.
  for (const driver of newDrivers) {
    // If driverName already exists in drivers array.
    if (driver.name.toLowerCase() === editForm.driverName.toLowerCase()) {
      errors.driverName = "A driver by that name already exists!"
      break
    }

    if (update && driver._id === editForm._id) {
      // If nothing has changed
      if (
        !editForm.icon &&
        driver.name === editForm.driverName &&
        driver.driverID === editForm.driverID &&
        driver.teams === editForm.teams &&
        driver.stats.nationality === editForm.nationality?.label &&
        driver.stats.heightCM === editForm.heightCM &&
        driver.stats.weightKG === editForm.weightKG &&
        driver.stats.birthday === moment(editForm.birthday).format() &&
        driver.stats.moustache === editForm.moustache &&
        driver.stats.mullet === editForm.mullet
      ) {
        errors.driverName = "No changes have been made."
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

export const driverDeleteErrors = (
  driver: driverType,
  setEditFormErr: React.Dispatch<React.SetStateAction<driverEditFormErrType>>,
): boolean => {
  const errors: driverEditFormErrType = {
    driverName: "",
    driverID: "",
    teams: "",
    nationality: "",
    heightCM: "",
    weightKG: "",
    birthday: "",
    moustache: "",
    mullet: "",
    dropzone: "",
    dropzoneBody: "",
  }

  if (driver.teams.length > 0) {
    errors.driverName = "This driver still belongs to a team."
  }

  setEditFormErr((prevErrs) => {
    return {
      ...prevErrs,
      ...errors,
    }
  })

  return Object.values(errors).some((error) => error !== "")
}
// Determine what privilages the user has to edit this driver.
export const canEditDriver = (driver: driverType, user: userType): "delete" | "edit" | "" => {
  const noTeams = driver.teams.length === 0
  const creator = createdByID(driver.created_by) === user._id
  const authority = user.permissions.adjudicator || creator
  // If user is admin, can do anything.
  if (user.permissions.admin) {
    return "delete"
  }
  // If user is an adjudicator or user created the driver and
  // the driver has no teams assigned to it, can delete.
  if (authority && noTeams) {
    return "delete"
  }
  // If user has the authority to do so, can edit the driver.
  if (authority) {
    return "edit"
  }
  // If user meets none of the criteria, cannot do anything.
  return ""
}
