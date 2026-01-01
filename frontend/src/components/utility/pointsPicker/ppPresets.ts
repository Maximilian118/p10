import { pointsStructureType } from "../../../shared/types"

export const presetNames: string[] = ["Tight Arse", "Default", "F1", "Moto GP", "Abundant"]

export const nivoColours = (fillAmount: number, error?: boolean): string[] => {
  const scheme = ["#FFD700", "#C0C0C0", "#CD7F32"]

  for (let i = 0; i < fillAmount; i++) {
    scheme.push("#bbcedf")
  }

  if (error) {
    return ["#d32f2f"]
  }

  return scheme
}

type nivoDataType = {
  presetName: string
  id: string
  label: string
  result: number
  value: number
}

// Maps array index to position number for P10-centric ordering.
// Order: P10, P9, P8, P7, P6, P5, P4, P3, P2, P1, P11, P12, P13...
const indexToPosition = (index: number): number => {
  if (index === 0) return 10 // P10 is always first (the target)
  if (index <= 9) return 10 - index // P9, P8, P7, P6, P5, P4, P3, P2, P1
  return index + 1 // P11, P12, P13, etc.
}

export const presetArrays = (preset: number): nivoDataType[] => {
  // Builds array with P10-centric ordering for standard presets.
  const nivoDataArr = (presetName: string, points: number[]) => {
    return points.map((p: number, i: number): nivoDataType => {
      const pos = indexToPosition(i)

      return {
        presetName,
        id: `P${pos}`,
        label: `P${pos}`,
        result: pos,
        value: p,
      }
    })
  }

  // Tight Arse is special: P10 for winner, "2nd" for closest non-winner.
  if (preset === 0) {
    return [
      { presetName: presetNames[0], id: "P10", label: "P10", result: 10, value: 2 },
      { presetName: presetNames[0], id: "2nd", label: "2nd", result: 0, value: 1 },
    ]
  }

  // prettier-ignore
  switch (preset) {
    case 1: return nivoDataArr(presetNames[1], [16, 12, 8, 6, 5, 4, 3, 2])
    case 2: return nivoDataArr(presetNames[2], [25, 18, 15, 12, 10, 8, 6, 4, 2, 1])
    case 3: return nivoDataArr(presetNames[3], [25, 20, 15, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    case 4: return nivoDataArr(presetNames[4], [48, 36, 24, 22, 20, 18, 16, 14, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1])
    default: return nivoDataArr(presetNames[1], [16, 12, 8, 6, 5, 4, 3, 2])
  }
}

// Identifies which preset matches a given points structure.
export const identifyPresetFromStructure = (pointsStructure: pointsStructureType): number => {
  const points = pointsStructure.map((p) => p.points)

  for (let i = 0; i < presetNames.length; i++) {
    const presetPoints = presetArrays(i).map((p) => p.value)
    if (
      points.length === presetPoints.length &&
      points.every((p, idx) => p === presetPoints[idx])
    ) {
      return i
    }
  }

  return 1 // Default if no match found
}
