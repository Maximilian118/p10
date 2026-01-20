import { createChampFormType } from "./CreateChamp"

// Validates all required fields for championship creation form.
// Returns an error object with the first validation error found, or null if valid.
export const validateChampForm = (
  form: createChampFormType
): Record<string, string> | null => {
  if (!form.champName) {
    return { champName: "Championship name is required." }
  }

  if (!form.icon || !form.profile_picture) {
    return { dropzone: "Championship icon is required." }
  }

  if (!form.series) {
    return { series: "A series is required." }
  }

  if (form.pointsStructure.length === 0) {
    return { pointsStructure: "Points structure is required." }
  }

  if (form.rulesAndRegs.length === 0) {
    return { rulesAndRegs: "At least one rule is required." }
  }

  return null
}
