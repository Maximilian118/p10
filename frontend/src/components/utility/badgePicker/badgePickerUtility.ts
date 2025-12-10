import { formatString, getFilename } from "../../../shared/requests/requestsUtility"
import { badgeType } from "../../../shared/types"
import { editFormErrType } from "./badgePickerEdit/BadgePickerEdit"

interface badgeErrCheckType {
  name: string
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
  const errors: editFormErrType = {
    badgeName: "",
    awardedHow: "",
    dropzone: "",
  }

  if (!badge.name) {
    errors.badgeName = "Please enter a name."
  }

  if (!badge.awardedHow) {
    errors.awardedHow = "Please select one."
  }

  if (isNewBadge) {
    if (!badge.icon) {
      errors.dropzone = "Please select an image."
    }
  }

  // If the current badge is in the array, remove it. Can't use _id to compare but awardedHow's should be unique.
  const badges = champBadges.filter((b: badgeType) => b.awardedHow !== badge.awardedHow)

  // Loop through all of the badges in champBadges and check if the current badge has any duplicate values.
  for (const b of badges) {
    if (badge.icon instanceof File) {
      const newFilename = formatString(badge.icon.name)

      if (newFilename === formatString(getFilename(b.url))) {
        errors.dropzone = "Duplicate badge image."
        break
      }

      if (b.file && newFilename === formatString(b.file.name)) {
        errors.dropzone = "Duplicate badge image."
        break
      }
    }

    if (b.name.toLowerCase() === badge.name.toLowerCase()) {
      errors.badgeName = "Duplicate name."
      break
    }

    if (b.awardedHow === badge.awardedHow) {
      errors.badgeName = "Duplicate 'Awarded For'... This is simply illegal!"
      break
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
