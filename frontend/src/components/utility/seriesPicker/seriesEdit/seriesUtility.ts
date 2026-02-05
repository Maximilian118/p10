import { userType } from "../../../../shared/localStorage"
import { seriesType } from "../../../../shared/types"
import { canEditEntity } from "../../../../shared/entityPermissions"

// Determine what privileges the user has to edit this series.
// Uses usage-scoped adjudicator model.
export const canEditSeries = (series: seriesType, user: userType): "delete" | "edit" | "" => {
  return canEditEntity(series, user, series.championships || [])
}
