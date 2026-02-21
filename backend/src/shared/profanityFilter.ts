import Filter from "bad-words"

// Shared profanity filter instance for the entire app.
const profanityFilter = new Filter()

// Checks if the given text contains profanity.
export const isProfane = (text: string): boolean => {
  return profanityFilter.isProfane(text)
}
