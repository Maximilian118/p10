// Utility function to determine if error should be displayed.
// Centralizes all error-checking logic for reuse by ImageIcon, userIcon, etc.
export const shouldShowImageError = (
  src: string | undefined | null,
  hasLoadError: boolean,
): boolean => {
  // No src provided (undefined, null, empty string).
  if (!src) return true

  // Whitespace-only string is invalid.
  if (src.trim() === '') return true

  // Image failed to load (network error, 404, etc.).
  if (hasLoadError) return true

  return false
}
