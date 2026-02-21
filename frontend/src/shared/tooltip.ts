// Centralised tooltip content for InfoModals across the app.

export interface TooltipContent {
  title: string
  description: string[]
}

export const tooltips = {
  championship: {
    title: "What is a Championship?",
    description: [
      "A championship is a season-long prediction competition. Competitors bet on which driver will finish in P10 each round.",
      "Points are awarded based on how close the bet is to the actual P10 finisher. The championship tracks standings, awards badges for achievements, and can be enrolled in a league to compete against other championships.",
    ],
  },
  league: {
    title: "What is a League?",
    description: [
      "A league is a competition between championships. Each championship earns a prediction score based on how accurately its members predict P10 finishers.",
      "Championships are ranked by their average prediction score across all rounds. Leagues lock after 20% of the season's rounds are completed, preventing new entries mid-season.",
    ],
  },
  series: {
    title: "What is a Series?",
    description: [
      "A series represents a real-world racing series like Formula 1 or Formula 2. It defines the pool of drivers available for betting and the number of rounds in a season.",
      "Championships are created within a series and inherit its driver lineup.",
    ],
  },
  driver: {
    title: "What is a Driver?",
    description: [
      "A driver represents a real-world racing driver. Drivers are assigned to a series and can belong to a team.",
      "During each round of a championship, competitors place bets on which driver will finish in P10. Drivers can be shared across multiple series and championships.",
    ],
  },
  team: {
    title: "What is a Team?",
    description: [
      "A team represents a real-world racing team or constructor. Teams contain drivers and can be associated with multiple series.",
      "Teams help organise drivers and provide additional context for the competition.",
    ],
  },
} as const
