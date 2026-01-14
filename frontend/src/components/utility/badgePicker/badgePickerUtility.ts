import { formatString, getFilename } from "../../../shared/requests/requestsUtility"
import { badgeType } from "../../../shared/types"
import { editFormErrType } from "./badgePickerEdit/BadgePickerEdit"

interface badgeErrCheckType {
  customName: string
  icon: File | string | null
  awardedHow: string | null
}

// Check badgePickerEdit errors on submission.
export const badgePickerErrors = (
  isNewBadge: boolean,
  badge: badgeErrCheckType,
  setEditFormErr: React.Dispatch<React.SetStateAction<editFormErrType>>,
  champBadges: badgeType[],
): boolean => {
  // Reset errors before validation.
  setEditFormErr({
    customName: "",
    awardedHow: "",
    dropzone: "",
  })

  let hasErrors = false

  // Note: customName is optional - no required check needed.

  if (!badge.awardedHow) {
    setEditFormErr(prev => ({ ...prev, awardedHow: "Required." }))
    hasErrors = true
  }

  if (isNewBadge && !badge.icon) {
    setEditFormErr(prev => ({ ...prev, dropzone: "Required." }))
    hasErrors = true
  }

  // Filter out current badge for duplicate checking (using awardedHow as unique identifier).
  const otherBadges = champBadges.filter((b: badgeType) => b.awardedHow !== badge.awardedHow)

  // Check for duplicates among other badges.
  for (const b of otherBadges) {
    // Check for duplicate file names (badge-specific logic).
    if (badge.icon instanceof File) {
      const newFilename = formatString(badge.icon.name)

      if (newFilename === formatString(getFilename(b.url))) {
        setEditFormErr(prev => ({ ...prev, dropzone: "Duplicate badge image." }))
        hasErrors = true
        break
      }

      if (b.file && newFilename === formatString(b.file.name)) {
        setEditFormErr(prev => ({ ...prev, dropzone: "Duplicate badge image." }))
        hasErrors = true
        break
      }
    }

    // Check for duplicate custom names (only if user entered one).
    if (badge.customName && b.customName && b.customName.toLowerCase() === badge.customName.toLowerCase()) {
      setEditFormErr(prev => ({ ...prev, customName: "A badge by that name already exists!" }))
      hasErrors = true
      break
    }

    // Check for duplicate awardedHow values.
    if (b.awardedHow === badge.awardedHow) {
      setEditFormErr(prev => ({ ...prev, awardedHow: "Duplicate 'Awarded For'." }))
      hasErrors = true
      break
    }
  }

  return hasErrors
}
