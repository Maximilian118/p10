// ─── Shared Utilities for OpenF1/SignalR Services ────────────────

// Recursively deep-merges source into target (mutates target).
// Handles the SignalR incremental update pattern where only changed fields are sent.
// Objects are recursively merged; all other values (arrays, primitives) are replaced.
export const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> => {
  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal && typeof sourceVal === "object" && !Array.isArray(sourceVal) &&
      targetVal && typeof targetVal === "object" && !Array.isArray(targetVal)
    ) {
      deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      )
    } else {
      target[key] = sourceVal
    }
  }
  return target
}
