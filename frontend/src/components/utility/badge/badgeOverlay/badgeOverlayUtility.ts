export const getBadgeColour = (rarity: number, error?: boolean): string => {
  if (error) {
    return "#d32f2f" // Error
  }

  switch (rarity) {
    case 0:
      return "#9d9d9d" // Common
    case 1:
      return "#967969" // Uncommon
    case 2:
      return "#66bb6a" // Rare
    case 3:
      return "#3080d0" // Epic
    case 4:
      return "#DA70D6" // Legendary
    case 5:
      return "#FFC000" // Mythic
    default:
      return "#C0C0C0"
  }
}
