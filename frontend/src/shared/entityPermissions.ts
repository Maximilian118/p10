import { ChampType } from "./types"
import { userType } from "./localStorage"
import { createdByID } from "./utility"

interface EditableEntity {
  official?: boolean
  created_by?: userType | string
}

// Determine edit permissions for a shared entity (series, driver, team).
// Returns "delete" (full access), "edit" (modify only), or "" (no access).
// Uses usage-scoped adjudicator model:
//   - Unused entities: creator + any adjudicator + admins can edit/delete.
//   - Used in championships: only admins + adjudicators of those specific championships can edit.
//   - Official entities: admin only.
export const canEditEntity = (
  entity: EditableEntity | null | undefined,
  user: userType,
  championships: ChampType[],
): "delete" | "edit" | "" => {
  // Creating a new entity — anyone can create.
  if (!entity) return "edit"

  // Official entities: admin only.
  if (entity.official && !user.permissions.admin) return ""

  // Admin always has full access.
  if (user.permissions.admin) return "delete"

  const creator = createdByID(entity.created_by) === user._id
  const usedInChampionships = championships.length > 0

  // Not used in any championship: creator + any adjudicator can fully manage.
  if (!usedInChampionships) {
    if (user.permissions.adjudicator || creator) return "delete"
    return ""
  }

  // Used in championships: only adjudicators of those specific championships can edit.
  const isAdjudicatorOfUsingChamp = championships.some(
    c => c.adjudicator?.current?._id === user._id
  )
  if (isAdjudicatorOfUsingChamp) return "edit"

  return ""
}
