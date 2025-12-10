import { userType } from "../../../../shared/localStorage"
import { seriesType } from "../../../../shared/types"
import { createdByID } from "../../../../shared/utility"
import { seriesEditFormErrType, seriesEditFormType } from "./SeriesEdit"

// Validate series edit form and set errors.
export const seriesEditErrors = (
  editForm: seriesEditFormType,
  setEditFormErr: React.Dispatch<React.SetStateAction<seriesEditFormErrType>>,
  seriesList: seriesType[],
  update?: boolean,
): boolean => {
  const errors: seriesEditFormErrType = {
    seriesName: "",
    drivers: "",
    dropzone: "",
  }

  if (!editForm.seriesName) {
    errors.seriesName = "Please enter a name."
  }

  if (!editForm.icon && !update) {
    errors.dropzone = "Please enter an image."
  }

  if (editForm.drivers.length < 2) {
    errors.drivers = "2 or more drivers are required."
  }
  // Remove the series with this editForm._id from the series list for duplicate checking.
  const filteredSeries = seriesList.filter((s) => s._id !== editForm._id)
  // Loop through all of the existing series.
  for (const series of filteredSeries) {
    // If seriesName already exists in series list.
    if (series.name.toLowerCase() === editForm.seriesName.toLowerCase()) {
      errors.seriesName = "A series by that name already exists!"
    }

    if (update && series._id === editForm._id) {
      // If nothing has changed
      if (
        series.name === editForm.seriesName &&
        series.drivers === editForm.drivers &&
        !editForm.icon
      ) {
        errors.seriesName = "No changes have been made."
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

// Validate series delete and set errors.
export const seriesDeleteErrors = (
  series: seriesType,
  setEditFormErr: React.Dispatch<React.SetStateAction<seriesEditFormErrType>>,
): boolean => {
  const errors: seriesEditFormErrType = {
    seriesName: "",
    drivers: "",
    dropzone: "",
  }

  if (series.drivers.length > 2) {
    errors.drivers = "Series has too many drivers."
  }

  if (series.championships.length > 0) {
    errors.seriesName = "Series still belongs to some championships."
  }

  setEditFormErr((prevErrs) => {
    return {
      ...prevErrs,
      ...errors,
    }
  })

  return Object.values(errors).some((error) => error !== "")
}

// Determine what privileges the user has to edit this series.
export const canEditSeries = (series: seriesType, user: userType): "delete" | "edit" | "" => {
  const lessThan2Drivers = series.drivers.length < 2
  const hasNoChamps = series.championships.length === 0
  const creator = createdByID(series.created_by) === user._id
  const authority = user.permissions.adjudicator || creator

  // If user is admin, can do anything.
  if (user.permissions.admin) {
    return "delete"
  }
  // If user is an adjudicator or user created the series and
  // the series has no drivers assigned to it, can delete.
  if (creator && lessThan2Drivers && hasNoChamps) {
    return "delete"
  }
  // If user has the authority to do so, can edit the series.
  if (authority) {
    return "edit"
  }
  // If user meets none of the criteria, cannot do anything.
  return ""
}
