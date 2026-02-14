// --- Tyre compound types ---

export type TyreLabel = "soft" | "medium" | "hard" | "intermediate" | "wet"
export type BaseCompound = 1 | 2 | 3 | 4 | 5
export type CompoundDisplay = TyreLabel | "c1" | "c2" | "c3" | "c4" | "c5"

// Maps which C-compounds are assigned to hard/medium/soft for a given weekend
export interface CompoundAllocation {
  hard: BaseCompound
  medium: BaseCompound
  soft: BaseCompound
}

// Valid tyre label strings (lowercase)
const TYRE_LABELS: Set<string> = new Set(["soft", "medium", "hard", "intermediate", "wet"])

// Colour hex values matching official Pirelli F1 compound markings
const COMPOUND_COLOURS: Record<CompoundDisplay, string> = {
  soft: "#ef242d",
  medium: "#FFC72C",
  hard: "#FFFFFF",
  intermediate: "#43B02A",
  wet: "#0067AD",
  c1: "#888888",
  c2: "#888888",
  c3: "#888888",
  c4: "#888888",
  c5: "#888888"
}

// Display letter shown in the centre of the tyre indicator
const COMPOUND_LETTERS: Record<CompoundDisplay, string> = {
  soft: "S",
  medium: "M",
  hard: "H",
  intermediate: "I",
  wet: "W",
  c1: "C1",
  c2: "C2",
  c3: "C3",
  c4: "C4",
  c5: "C5"
}

// Resolves a compound input (string label or number 1-5) to a normalised CompoundDisplay.
// When a number is given with an allocation, resolves to the weekend label (soft/medium/hard).
// When a number is given without allocation, falls back to "c1"-"c5".
// Returns null for invalid input.
export const resolveCompound = (
  compound: string | number,
  allocation?: CompoundAllocation
): CompoundDisplay | null => {
  // Handle numeric compound (C1-C5)
  if (typeof compound === "number") {
    if (compound < 1 || compound > 5 || !Number.isInteger(compound)) return null

    // Resolve via allocation if provided
    if (allocation) {
      if (allocation.hard === compound) return "hard"
      if (allocation.medium === compound) return "medium"
      if (allocation.soft === compound) return "soft"
    }

    return `c${compound}` as CompoundDisplay
  }

  // Handle string compound — normalise to lowercase and validate
  const normalised = compound.toLowerCase()
  if (TYRE_LABELS.has(normalised)) return normalised as TyreLabel

  return null
}

// Returns the official Pirelli hex colour for a given compound display value.
export const getCompoundColour = (compound: CompoundDisplay): string => {
  return COMPOUND_COLOURS[compound]
}

// Returns the display letter(s) for a given compound display value.
export const getCompoundLetter = (compound: CompoundDisplay): string => {
  return COMPOUND_LETTERS[compound]
}
