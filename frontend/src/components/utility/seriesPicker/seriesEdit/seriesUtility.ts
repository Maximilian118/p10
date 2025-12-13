import { userType } from "../../../../shared/localStorage"
import { seriesType } from "../../../../shared/types"
import { createdByID } from "../../../../shared/utility"

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
