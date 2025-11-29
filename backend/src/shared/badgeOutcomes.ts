// A list of badge reward outcomes.
// There may be more outcomes than there are badges in the DB.
// Therefore, we must do it this way rather than just pulling awardedHow and awardedDesc from all of the badges in the DB.
// If people create enough badges down the line to populate all of the below then we'll just pull from the DB.
export type badgeOutcomeType = { awardedHow: string; awardedDesc: string }

const badgeRewardOutcomes: badgeOutcomeType[] = [
  {
    awardedHow: "Adj removed a competitior.",
    awardedDesc: "As an adjudicator you removed someone from a championship. Oh damn...",
  },
  {
    awardedHow: "Adjudicator deducted points.",
    awardedDesc:
      "As an adjudicator you have deducted points from someone. Someone's got to do the diry work.",
  },
  {
    awardedHow: "Be Adjudicator.",
    awardedDesc: "Be promoted to Adjudicator.",
  },
  {
    awardedHow: "Be demoted from competitor.",
    awardedDesc: "Be demoted from competitor status in a championship.",
  },
  {
    awardedHow: "Be last in a round.",
    awardedDesc: "Be last in a round. Bad luck.",
  },
  {
    awardedHow: "Be promoted to competitor.",
    awardedDesc: "Be promoted from guest to competitor of a championship.",
  },
  {
    awardedHow: "Be demoted to guest.",
    awardedDesc: "Be demoted from competitor to a guest of a championship.",
  },
  {
    awardedHow: "Be runner up 3 times.",
    awardedDesc: "Get runner up three times in a championship. You'll get there one day.",
  },
  {
    awardedHow: "Be runner up 5 times.",
    awardedDesc: "Get runner up five times in a championship.",
  },
  {
    awardedHow: "Be runner up 7 times.",
    awardedDesc: "Get runner up five times in a championship. Consistency is everything!",
  },
  {
    awardedHow: "Bet on driver Q1 finish.",
    awardedDesc: "You bet on a driver that didn't leave Q1. How embarrassing.",
  },
  {
    awardedHow: "Bet on driver Q2 finish.",
    awardedDesc: "You bet on a driver that didn't leave Q2.",
  },
  {
    awardedHow: "Bet on a podium finish.",
    awardedDesc: "Bet on a driver that lands on the podium. Eeesh.",
  },
  {
    awardedHow: "Bet on a winning driver.",
    awardedDesc: "Bet on a driver that lands on the podium. You muppet.",
  },
  {
    awardedHow: "Champ finish no points.",
    awardedDesc: "Finish a championship with no points at all. Never mind. Cake?",
  },
  {
    awardedHow: "Champ Finish top 3.",
    awardedDesc: "Finish in the top three of a championship! Congratulations!",
  },
  {
    awardedHow: "Champ Finish top 5.",
    awardedDesc: "Finish in the top five of a championship. Good effort.",
  },
  {
    awardedHow: "Championship Win!",
    awardedDesc: "Win a championship! Congratulations! Here's a big cock to celibrate!",
  },
  {
    awardedHow: "Compete in every round.",
    awardedDesc: "Compete in every round in a championship.",
  },
  {
    awardedHow: "Deducted Points Adjudicator.",
    awardedDesc: "An adjudicator deducted points from you. Naughty Naughty!",
  },
  {
    awardedHow: "Did Not Finish. (DNF)",
    awardedDesc: "Bet on a driver that DNF'd. Are you high?!",
  },
  {
    awardedHow: "Did not start. (DNS)",
    awardedDesc: "Bet on a driver that did not start.",
  },
  {
    awardedHow: "Different bet 6 rounds.",
    awardedDesc: "Bet on a different driver every round for 6 rounds.",
  },
  {
    awardedHow: "Driver No Points Win.",
    awardedDesc:
      "After half way through a championship, win with a driver that hasn't scored a point.",
  },
  {
    awardedHow: "Even points streak 4.",
    awardedDesc: "Have an even number of points for the past four races.",
  },
  {
    awardedHow: "First champ round win.",
    awardedDesc: "Win the first round of a championship.",
  },
  {
    awardedHow: "First win ever.",
    awardedDesc: "Win your first ever round.",
  },
  {
    awardedHow: "Have same points as 2 others.",
    awardedDesc:
      "When you have more than 10 points, have the same mount of points as two other competitiors.",
  },
  {
    awardedHow: "Have same points as 3 others.",
    awardedDesc:
      "When you have more than 2 points, have the same mount of points as three other competitiors.",
  },
  {
    awardedHow: "Have same points as 5 others.",
    awardedDesc:
      "When you have more than 2 points, have the same mount of points as five other competitiors.",
  },
  {
    awardedHow: "Jakob win and top 5.",
    awardedDesc: "Score within the top 5 in a round that Jakob won.",
  },
  {
    awardedHow: "Championship joined.",
    awardedDesc: "You joined a championship. Good Luck!",
  },
  {
    awardedHow: "Last 3 with no points.",
    awardedDesc: "Be one of the last three people with no points.",
  },
  {
    awardedHow: "Last at Champ finish.",
    awardedDesc: "Be last when a championship ends. This should never happen.",
  },
  {
    awardedHow: "Lose to Max 8 times.",
    awardedDesc: "Max has beaten you 8 times in a row.",
  },
  {
    awardedHow: "Lose with a Red Bull.",
    awardedDesc: "Bet on a Red Bull and don't score any points. Fair one.",
  },
  {
    awardedHow: "Lose with a Ferrari.",
    awardedDesc: "Bet on a Ferrari and don't score any points. Mamma mia!",
  },
  {
    awardedHow: "Lose with a Mclaren.",
    awardedDesc: "Bet on a Mclaren and don't score any points. Shame. Cup'a tea?",
  },
  {
    awardedHow: "Lose with a Aston Martin.",
    awardedDesc: "Bet on a Aston Martin and don't score any points.",
  },
  {
    awardedHow: "Lose with a Mercedes.",
    awardedDesc:
      "Bet on a Mercedes driver and don't score any points. You should have listened to Jorge.",
  },
  {
    awardedHow: "Lose with a VCarb",
    awardedDesc: "Bet on a VCarb and don't score any points.",
  },
  {
    awardedHow: "Lose with a Hass",
    awardedDesc: "Bet on a Hass and don't score any points.",
  },
  {
    awardedHow: "Lose with an Alpine",
    awardedDesc: "Bet on an Alpine and don't score any points.",
  },
  {
    awardedHow: "Lose with a Williams",
    awardedDesc: "Bet on an Williams and don't score any points.",
  },
  {
    awardedHow: "Lose with a Sauber",
    awardedDesc: "Bet on an Sauber and don't score any points.",
  },
  {
    awardedHow: "No Points after 10 rounds.",
    awardedDesc: "You have no points after 10 rounds. Get your shit together.",
  },
  {
    awardedHow: "No points round closest.",
    awardedDesc: "Place the closest bet when nobody wins any points.",
  },
  {
    awardedHow: "No Points Round.",
    awardedDesc: "Score no points in a round.",
  },
  {
    awardedHow: "No points when Dale won.",
    awardedDesc: "Win no points when anyone named Dale has won.",
  },
  {
    awardedHow: "No vote for 1 round.",
    awardedDesc: "You decided not to vote for a round.. You must be too cool for this game.",
  },
  {
    awardedHow: "No vote for 3 rounds.",
    awardedDesc: "You did not vote for three rounds... Zav is not best pleased.",
  },
  {
    awardedHow: "No vote for 7 rounds.",
    awardedDesc: "You decided not to vote 7 times in a row. Why are you even here?",
  },
  {
    awardedHow: "Nobody knows...",
    awardedDesc: "You won Claw Zav! Why? Nobody knows...",
  },
  {
    awardedHow: "Nobody won a round.",
    awardedDesc: "Nobody won a round in your championship!",
  },
  {
    awardedHow: "Oldest driver win.",
    awardedDesc: "Win with the oldest driver on the grid.",
  },
  {
    awardedHow: "Point Lead 6.",
    awardedDesc: "Be 6 points ahead of anyone else.",
  },
  {
    awardedHow: "Point Lead 12.",
    awardedDesc: "Be 12 points ahead of anyone else.",
  },
  {
    awardedHow: "Point Lead 24.",
    awardedDesc: "Be 24 points ahead of anyone else.",
  },
  {
    awardedHow: "Points streak championship.",
    awardedDesc: "Win a point every round in the championship. Points nom nom.",
  },
  {
    awardedHow: "Points streak 10.",
    awardedDesc: "Win a point every round for 10 rounds.",
  },
  {
    awardedHow: "Points streak 6.",
    awardedDesc: "Win a point every round for 6 rounds.",
  },
  {
    awardedHow: "Points 20 when max points 2.",
    awardedDesc: "Score over 20 points when the maximum points you can win per round is 2.",
  },
  {
    awardedHow: "Same driver Points in a row 2.",
    awardedDesc: "Score points on the same driver twice in a row.",
  },
  {
    awardedHow: "Q length shorter than 2:15h.",
    awardedDesc:
      "Score points in a qualifying round that lasted no more than an hour and a quater.",
  },
  {
    awardedHow: "Q length longer than 2:30h.",
    awardedDesc:
      "Score points in a qualifying round that lasted no more than an hour and a quater.",
  },
  {
    awardedHow: "Runner up with a Mercedes.",
    awardedDesc: "Win runner up with a Mercedes driver.",
  },
  {
    awardedHow: "Runner up with a Red Bull.",
    awardedDesc: "Win runner up with a Red Bull driver.",
  },
  {
    awardedHow: "Runner up with a Ferrari.",
    awardedDesc: "Win runner up with a Ferrari driver.",
  },
  {
    awardedHow: "Runner up with a Mclaren.",
    awardedDesc: "Win runner up with a Mclaren driver.",
  },
  {
    awardedHow: "Runner up with a Aston Martin.",
    awardedDesc: "Win runner up with a Aston Martin driver.",
  },
  {
    awardedHow: "Runner up with a VCarb.",
    awardedDesc: "Win runner up with a VCarb driver.",
  },
  {
    awardedHow: "Runner up with a Hass.",
    awardedDesc: "Win runner up with a Hass driver.",
  },
  {
    awardedHow: "Runner up with an Alpine.",
    awardedDesc: "Win runner up with an Alpine driver.",
  },
  {
    awardedHow: "Runner up with a Williams.",
    awardedDesc: "Win runner up with a Williams driver.",
  },
  {
    awardedHow: "Runner up with a Sauber.",
    awardedDesc: "Win runner up with a Sauber driver.",
  },
  {
    awardedHow: "Same bet x2 no points.",
    awardedDesc: "Bet on the same driver twice in a row and both times scored no points.",
  },
  {
    awardedHow: "Same bet x4 no points.",
    awardedDesc: "Bet on the same driver four times in a row and both times scored no points.",
  },
  {
    awardedHow: "Same bet x2 points.",
    awardedDesc: "Bet on the same driver twice in a row and both times score points.",
  },
  {
    awardedHow: "Same bet x4 points.",
    awardedDesc: "Bet on the same driver four times in a row and both times score points.",
  },
  {
    awardedHow: "Same bet x2 win.",
    awardedDesc: "Bet on the same driver twice in a row and both times win!",
  },
  {
    awardedHow: "Same bet x4 win.",
    awardedDesc: "Bet on the same driver four times in a row and win every time!",
  },
  {
    awardedHow: "Tallest driver win.",
    awardedDesc: "Win with the tallest driver on the grid.",
  },
  {
    awardedHow: "Shortest driver win.",
    awardedDesc: "Win with the shortest driver on the grid.",
  },
  {
    awardedHow: "Two Championship Win streak!",
    awardedDesc: "Win two championships in a row. (╯°□°)╯︵ ┻━┻ You magnificent being!",
  },
  {
    awardedHow: "Wet Win.",
    awardedDesc: "Win a wet round.",
  },
  {
    awardedHow: "Wet Runner Up.",
    awardedDesc: "Come runner up in a wet round.",
  },
  {
    awardedHow: "Wet podium.",
    awardedDesc: "Get on the podium in a wet round.",
  },
  {
    awardedHow: "Win 10 dry rounds all time.",
    awardedDesc: "Win 10 dry rounds for all of the time you've been in this championship.",
  },
  {
    awardedHow: "Win 50 dry rounds all time.",
    awardedDesc: "Win 50 dry rounds for all of the time you've been in this championship.",
  },
  {
    awardedHow: "Win 100 dry rounds all time.",
    awardedDesc: "Win 100 dry rounds for all of the time you've been in this championship.",
  },
  {
    awardedHow: "Win 6 rounds in a champ.",
    awardedDesc: "Win six rounds over the course of a championship.",
  },
  {
    awardedHow: "Win 12 rounds in a champ.",
    awardedDesc: "Win twelve rounds over the course of a championship. 'OH Lavly'",
  },
  {
    awardedHow: "Win 2 times in a row.",
    awardedDesc: "Win points two times in a row.",
  },
  {
    awardedHow: "Win 3 times in a row.",
    awardedDesc: "Win points three times in a row.",
  },
  {
    awardedHow: "Win 5 times in a row.",
    awardedDesc: "Win points five times in a row. Stop it you thug!",
  },
  {
    awardedHow: "Win After 3 week break.",
    awardedDesc: "Win the first race after a 3 week break.",
  },
  {
    awardedHow: "Win after Christmas.",
    awardedDesc: "Win the first round after Christmas.",
  },
  {
    awardedHow: "Win after Independence Day.",
    awardedDesc: "Win the first round after Korea's Independence Movement Day.",
  },
  {
    awardedHow: "Win after Star Wars first aired.",
    awardedDesc: "Win the first round after May the 4th.",
  },
  {
    awardedHow: "Win after Jurrassic Park release.",
    awardedDesc:
      "Win the first round after June the 11th, the date that Jurrasic Park first aired.",
  },
  {
    awardedHow: "Win after no bet last round.",
    awardedDesc: "Win a round after not betting the previous round.",
  },
  {
    awardedHow: "Win after no points 12 rounds.",
    awardedDesc:
      "Score a point after scoring no points for the past twelve rounds. I knew you'd find some!",
  },
  {
    awardedHow: "Win after no points 6 rounds.",
    awardedDesc: "Win a round after scoring no points for 6 rounds.",
  },
  {
    awardedHow: "Win after Nowruz Fest.",
    awardedDesc: "Win the first round after Baku's Nowruz Festival.",
  },
  {
    awardedHow: "Win after StarTrek aired.",
    awardedDesc:
      "Win the first round after September the 8th, the date that Star Trek first aired.",
  },
  {
    awardedHow: "Win after the Grand National.",
    awardedDesc: "Be runner up in the first round after the Grand National.",
  },
  {
    awardedHow: "Win last round of tripple header.",
    awardedDesc: "Win the last round of a tripple header.",
  },
  {
    awardedHow: "Win first round of tripple header.",
    awardedDesc: "Win the first round of a tripple header.",
  },
  {
    awardedHow: "Win heaviest driver.",
    awardedDesc: "Win with the heaviest driver on the grid.",
  },
  {
    awardedHow: "Win lightest driver.",
    awardedDesc: "Win with the lightest driver on the grid.",
  },
  {
    awardedHow: "Win last round of champ.",
    awardedDesc: "Win the last round of a championship.",
  },
  {
    awardedHow: "Win Single Header.",
    awardedDesc: "Win a single header event.",
  },
  {
    awardedHow: "Win then no win 5.",
    awardedDesc: "Win no points for 5 rounds after winning a round.",
  },
  {
    awardedHow: "Win when Red Bull Pole",
    awardedDesc: "Win when a Red Bull has finished on Pole.",
  },
  {
    awardedHow: "Win when Ferrari Pole",
    awardedDesc: "Win when a Ferrari has finished on Pole.",
  },
  {
    awardedHow: "Win when Aston Martin Pole.",
    awardedDesc: "Win when an Aston Martin has finished on Pole.",
  },
  {
    awardedHow: "Win when Mclaren Pole.",
    awardedDesc: "Win when a Mclaren has finished on Pole.",
  },
  {
    awardedHow: "Win when Mercedes Pole.",
    awardedDesc: "Win when a Mercedes has finished on Pole.",
  },
  {
    awardedHow: "Win when VCarb Pole.",
    awardedDesc: "Win when a VCarb has finished on Pole.",
  },
  {
    awardedHow: "Win when Hass Pole.",
    awardedDesc: "Win when a Hass has finished on Pole.",
  },
  {
    awardedHow: "Win when Alpine Pole.",
    awardedDesc: "Win when an Alpine has finished on Pole.",
  },
  {
    awardedHow: "Win when Williams Pole.",
    awardedDesc: "Win when a Williams has finished on Pole.",
  },
  {
    awardedHow: "Win when Sauber Pole.",
    awardedDesc: "Win when a Sauber has finished on Pole.",
  },
  {
    awardedHow: "Win when RIC in Q3.",
    awardedDesc: "Win when Daniel Ricciardo finishes in Q3.",
  },
  {
    awardedHow: "Win when Thomas last.",
    awardedDesc: "Win a round when Thomas came last.",
  },
  {
    awardedHow: "Win with 10 players.",
    awardedDesc: "Win a round when 10 or more competitors have placed a bet.",
  },
  {
    awardedHow: "Win with 20 players/full.",
    awardedDesc:
      "Win a round when a championship is full of competitors and everyone has placed a bet.",
  },
  {
    awardedHow: "Win with a Red Bull.",
    awardedDesc: "Win a round with with a Red Bull.",
  },
  {
    awardedHow: "Win with a Ferrari.",
    awardedDesc: "Win a round with with a Ferrari.",
  },
  {
    awardedHow: "Win with a Mercedes.",
    awardedDesc: "Win a round with with a Mercedes.",
  },
  {
    awardedHow: "Win with a McLaren.",
    awardedDesc: "Win a round with with a McLaren.",
  },
  {
    awardedHow: "Win with a VCarb.",
    awardedDesc: "Win a round with with a VCarb.",
  },
  {
    awardedHow: "Win with a Hass.",
    awardedDesc: "Win a round with with a Hass.",
  },
  {
    awardedHow: "Win with a Williams.",
    awardedDesc: "Win a round with with a Williams.",
  },
  {
    awardedHow: "Win with a Sauber.",
    awardedDesc: "Win a round with with a Sauber.",
  },
  {
    awardedHow: "Win with Alpine.",
    awardedDesc: "Win a round with with an Alpine.",
  },
  {
    awardedHow: "Win with an Aston Martin.",
    awardedDesc: "Win a round with with an Aston Martin.",
  },
  {
    awardedHow: "Win with a Mexican driver.",
    awardedDesc: "Win with a Mexican driver.",
  },
  {
    awardedHow: "Win with Aston Podium.",
    awardedDesc: "Win a round with an Aston Martin podium",
  },
  {
    awardedHow: "Win with Moustache driver.",
    awardedDesc: "Win a round with a driver that has a moustache. Good job old sport!",
  },
  {
    awardedHow: "Win with RBR dobule podium.",
    awardedDesc: "Win when both Red Bull drivers finish on the podium.",
  },
  {
    awardedHow: "Win with RBR not in Q3.",
    awardedDesc: "Win when both Red Bull drivers missed Q3!",
  },
  {
    awardedHow: "Win with team mate P9.",
    awardedDesc: "Win with a driver when their team mate finished in p9.",
  },
]

export default badgeRewardOutcomes

// Find the objects that contain the matching awardedHow value and return an array of outcomes.
export const findOutcomes = (
  badgeRewardOutcomes: badgeOutcomeType[],
  how: string,
): badgeOutcomeType[] => {
  return badgeRewardOutcomes.filter((outcome: badgeOutcomeType) => outcome.awardedHow === how)
}

// Find the objects that contain the matching awardedHow value and return an array of awardedHow's.
export const findHows = (badgeRewardOutcomes: badgeOutcomeType[], how: string): string[] => {
  return badgeRewardOutcomes
    .filter((outcome: badgeOutcomeType) => outcome.awardedHow === how)
    .map((outcome: badgeOutcomeType) => outcome.awardedHow)
}

// Find the objects that contain the matching awardedDesc value and return an array of awardedDesc's.
export const findDescs = (
  badgeRewardOutcomes: badgeOutcomeType[],
  desc: string | null,
): string[] => {
  return badgeRewardOutcomes
    .filter((outcome: badgeOutcomeType) => outcome.awardedDesc === desc)
    .map((outcome: badgeOutcomeType) => outcome.awardedDesc)
}

// Find the object that contains the awardedHow and return the relevant awardedDesc string.
export const findDesc = (badgeRewardOutcomes: badgeOutcomeType[], how: string | null): string => {
  return badgeRewardOutcomes.filter((outcome: badgeOutcomeType) => outcome.awardedHow === how)[0]
    .awardedDesc
}
