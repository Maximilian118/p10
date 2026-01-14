import { getBadgeColour } from "../components/utility/badge/badgeOverlay/BadgeOverlay"

// A list of badge reward outcomes with pre-determined rarity.
// Rarity Scale: 0=Common, 1=Uncommon, 2=Rare, 3=Epic, 4=Legendary, 5=Mythic
// SORTED BY RARITY: Common first, Mythic last
// name: Catchy display name | awardedHow: Evaluation key | awardedDesc: Long description
export type badgeOutcomeType = { name: string; awardedHow: string; awardedDesc: string; rarity: number }

export const badgeRewardOutcomes: badgeOutcomeType[] = [
  // ============================================================================
  // COMMON (Rarity 0) - Easy to earn
  // ============================================================================
  { name: "Victor", awardedHow: "Round Win", awardedDesc: "Win a round in a championship.", rarity: 0 },
  { name: "Second Best", awardedHow: "Round Runner-Up", awardedDesc: "Finish as runner-up in a round.", rarity: 0 },
  { name: "Podium Sitter", awardedHow: "Round Podium", awardedDesc: "Finish in the top 3 of a round.", rarity: 0 },
  { name: "High Five", awardedHow: "Round Top 5", awardedDesc: "Finish in the top 5 of a round.", rarity: 0 },
  { name: "Lucky Seven", awardedHow: "Round Top 7", awardedDesc: "Finish in the top 7 of a round.", rarity: 0 },
  { name: "Top Tenner", awardedHow: "Round Top 10", awardedDesc: "Finish in the top 10 of a round.", rarity: 0 },
  { name: "Back Marker", awardedHow: "Round Last", awardedDesc: "Finish last in a round.", rarity: 0 },
  { name: "Blanked", awardedHow: "No Points", awardedDesc: "Score no points in a round.", rarity: 0 },
  { name: "Lone Wolf", awardedHow: "Single Point", awardedDesc: "Score exactly 1 point in a round.", rarity: 0 },
  { name: "Deuce", awardedHow: "Two Points", awardedDesc: "Score exactly 2 points in a round.", rarity: 0 },
  { name: "Double Digits", awardedHow: "Double Digits", awardedDesc: "Reach 10+ total points in a championship.", rarity: 0 },
  { name: "Upper Half", awardedHow: "Top Half Finish", awardedDesc: "Finish in the top half of standings.", rarity: 0 },
  { name: "Lower Half", awardedHow: "Bottom Half Finish", awardedDesc: "Finish in the bottom half of standings.", rarity: 0 },
  { name: "Welcome Aboard", awardedHow: "Joined Championship", awardedDesc: "Join a championship.", rarity: 0 },
  { name: "Getting Started", awardedHow: "10 Rounds Played", awardedDesc: "Participate in 10 rounds total.", rarity: 0 },
  { name: "Quarter Master", awardedHow: "25 Rounds Played", awardedDesc: "Participate in 25 rounds total.", rarity: 0 },
  { name: "Slacker", awardedHow: "Missed Bet", awardedDesc: "Miss placing a bet for 1 round.", rarity: 0 },
  { name: "Participation Trophy", awardedHow: "Participation Trophy", awardedDesc: "Finish last with some points.", rarity: 0 },

  // ============================================================================
  // UNCOMMON (Rarity 1) - Moderate difficulty
  // ============================================================================
  { name: "Double Victor", awardedHow: "2 Round Wins", awardedDesc: "Win 2 rounds in a championship.", rarity: 1 },
  { name: "Triple Threat", awardedHow: "3 Round Wins", awardedDesc: "Win 3 rounds in a championship.", rarity: 1 },
  { name: "Always Close", awardedHow: "3x Runner-Up", awardedDesc: "Be runner-up 3 times in a championship.", rarity: 1 },
  { name: "Fast Starter", awardedHow: "First Round Win", awardedDesc: "Win the first round of a championship.", rarity: 1 },
  { name: "Breakthrough", awardedHow: "First Win Ever", awardedDesc: "Win your first ever round.", rarity: 1 },
  { name: "First Podium", awardedHow: "First Podium", awardedDesc: "Finish on the podium for the first time.", rarity: 1 },
  { name: "Near Miss Win", awardedHow: "Won With P9 or P11", awardedDesc: "Win by betting on P9 or P11.", rarity: 1 },
  { name: "Middle Child", awardedHow: "Round Middle", awardedDesc: "Finish exactly in the middle position.", rarity: 1 },
  { name: "Comfortable Lead", awardedHow: "6 Point Lead", awardedDesc: "Be 6+ points ahead of second place.", rarity: 1 },
  { name: "Tied Up", awardedHow: "Tied With 2", awardedDesc: "Have the same points as 2+ other competitors.", rarity: 1 },
  { name: "Maxed Out", awardedHow: "Max Round Points", awardedDesc: "Score maximum possible points in a single round.", rarity: 1 },
  { name: "High Five Points", awardedHow: "Five Points", awardedDesc: "Score exactly 5 points in a round.", rarity: 1 },
  { name: "Quarter Century", awardedHow: "25 Total Points", awardedDesc: "Reach 25+ total points in a championship.", rarity: 1 },
  { name: "Top Five Finish", awardedHow: "Championship Top 5", awardedDesc: "Finish in the top 5 of a championship.", rarity: 1 },
  { name: "Wooden Spoon", awardedHow: "Championship Last", awardedDesc: "Finish last in a championship.", rarity: 1 },
  { name: "Midpack", awardedHow: "Midpack Finish", awardedDesc: "Finish exactly in the middle of standings.", rarity: 1 },
  { name: "Drop Zone", awardedHow: "Relegated", awardedDesc: "Finish in relegation zone.", rarity: 1 },
  { name: "Half Century", awardedHow: "50 Rounds Played", awardedDesc: "Participate in 50 rounds total.", rarity: 1 },
  { name: "Three-peat Skip", awardedHow: "3 Missed Bets", awardedDesc: "Miss placing a bet for 3 consecutive rounds.", rarity: 1 },
  { name: "AWOL", awardedHow: "5 Missed Bets", awardedDesc: "Miss placing a bet for 5 consecutive rounds.", rarity: 1 },
  { name: "Regular", awardedHow: "Season Regular", awardedDesc: "Compete in at least 75% of rounds in a season.", rarity: 1 },
  { name: "Moving Up", awardedHow: "Promoted", awardedDesc: "Be promoted from guest to competitor.", rarity: 1 },
  { name: "Downgraded", awardedHow: "Demoted", awardedDesc: "Be demoted from competitor.", rarity: 1 },
  { name: "Top Team Fail", awardedHow: "Top Team Loss", awardedDesc: "Score zero with a driver from the top-ranked team.", rarity: 1 },
  { name: "Favorites Flop", awardedHow: "Top 3 Team Loss", awardedDesc: "Score zero with a driver from a top 3 team.", rarity: 1 },
  { name: "Loyal Fan", awardedHow: "Same Driver x3", awardedDesc: "Bet on the same driver for 3 consecutive rounds.", rarity: 1 },
  { name: "Q1 Casualty", awardedHow: "Q1 Elimination Bet", awardedDesc: "Bet on a driver who didn't make it out of Q1.", rarity: 1 },
  { name: "Q2 Casualty", awardedHow: "Q2 Elimination Bet", awardedDesc: "Bet on a driver who didn't make it out of Q2.", rarity: 1 },
  { name: "Euro Winner", awardedHow: "European Driver Win", awardedDesc: "Win with a European driver.", rarity: 1 },
  { name: "Double Down", awardedHow: "2 Win Streak", awardedDesc: "Win 2 rounds in a row.", rarity: 1 },
  { name: "Cold Streak", awardedHow: "3 No Points Streak", awardedDesc: "Score no points for 3 consecutive rounds.", rarity: 1 },
  { name: "Ice Cold", awardedHow: "4 No Points Streak", awardedDesc: "Score no points for 4 consecutive rounds.", rarity: 1 },
  { name: "Faithful Pick", awardedHow: "Same Driver Points x2", awardedDesc: "Score points with same driver 2 times in a row.", rarity: 1 },
  { name: "Podium Streak", awardedHow: "Podium Streak x2", awardedDesc: "Finish on podium 2 rounds in a row.", rarity: 1 },
  { name: "Freefall", awardedHow: "Dropped 5+ Positions", awardedDesc: "Drop 5+ positions in standings in one round.", rarity: 1 },
  { name: "Drought Breaker", awardedHow: "Points After 3 Dry", awardedDesc: "Score points after 3 rounds without any.", rarity: 1 },
  { name: "Triple Zero", awardedHow: "Triple Zero", awardedDesc: "Score 0 points three rounds in a row.", rarity: 1 },
  { name: "Heartbreaker", awardedHow: "Lost by 1 Point", awardedDesc: "Lose by exactly 1 point.", rarity: 1 },
  { name: "Nail Biter", awardedHow: "Won by 1 Point", awardedDesc: "Win by exactly 1 point.", rarity: 1 },
  { name: "Absolute Zero", awardedHow: "Absolute Zero", awardedDesc: "Finish last with zero points.", rarity: 1 },
  { name: "One Off", awardedHow: "Bet on P9 or P11", awardedDesc: "Bet on a driver who finished P9 or P11 (one off from P10).", rarity: 1 },
  { name: "Odd One Out", awardedHow: "Everyone Scored Except You", awardedDesc: "Score 0 when all other competitors scored.", rarity: 1 },

  // ============================================================================
  // RARE (Rarity 2) - Harder to achieve
  // ============================================================================
  { name: "Fab Five", awardedHow: "5 Round Wins", awardedDesc: "Win 5 rounds in a championship.", rarity: 2 },
  { name: "Magnificent Seven", awardedHow: "7 Round Wins", awardedDesc: "Win 7 rounds in a championship.", rarity: 2 },
  { name: "Five Time Bridesmaid", awardedHow: "5x Runner-Up", awardedDesc: "Be runner-up 5 times in a championship.", rarity: 2 },
  { name: "Strong Finisher", awardedHow: "Final Round Win", awardedDesc: "Win the last round of a championship.", rarity: 2 },
  { name: "Perfect P10", awardedHow: "Perfect P10", awardedDesc: "Bet on the exact P10 finisher.", rarity: 2 },
  { name: "Crowd Beater", awardedHow: "Large Field Win", awardedDesc: "Win a round with 10+ competitors.", rarity: 2 },
  { name: "Photo Finish", awardedHow: "Photo Finish", awardedDesc: "Win a round by tiebreaker.", rarity: 2 },
  { name: "Cruising", awardedHow: "12 Point Lead", awardedDesc: "Be 12+ points ahead of second place.", rarity: 2 },
  { name: "Dominant Lead", awardedHow: "18 Point Lead", awardedDesc: "Be 18+ points ahead of second place.", rarity: 2 },
  { name: "Three-Way Tie", awardedHow: "Tied With 3", awardedDesc: "Have the same points as 3+ other competitors.", rarity: 2 },
  { name: "Joint Leaders", awardedHow: "Tied For Lead", awardedDesc: "Be tied for first place in standings.", rarity: 2 },
  { name: "Even Steven", awardedHow: "Even Points Streak", awardedDesc: "Have even total points for 4 consecutive rounds.", rarity: 2 },
  { name: "Odd Ball", awardedHow: "Odd Points Streak", awardedDesc: "Have odd total points for 4 consecutive rounds.", rarity: 2 },
  { name: "Half Century Points", awardedHow: "50 Points", awardedDesc: "Reach 50+ total points in a championship.", rarity: 2 },
  { name: "Seventy Five Club", awardedHow: "75 Points", awardedDesc: "Reach 75+ total points in a championship.", rarity: 2 },
  { name: "Pointless Wonder", awardedHow: "Zero After 10 Rounds", awardedDesc: "Have zero points after 10 rounds.", rarity: 2 },
  { name: "Consistent Scorer", awardedHow: "Same Points x3", awardedDesc: "Score the same points in 3 consecutive rounds.", rarity: 2 },
  { name: "Downward Spiral", awardedHow: "Descending Points", awardedDesc: "Score descending points for 3 rounds.", rarity: 2 },
  { name: "Double Trouble", awardedHow: "10+ Points in Round", awardedDesc: "Score 10 or more points in a single round.", rarity: 2 },
  { name: "Podium Finish", awardedHow: "Championship Top 3", awardedDesc: "Finish in the top 3 of a championship.", rarity: 2 },
  { name: "Silver Medal", awardedHow: "Championship Runner-Up", awardedDesc: "Finish second in a championship.", rarity: 2 },
  { name: "Bronze Medal", awardedHow: "Championship Bronze", awardedDesc: "Finish third in a championship.", rarity: 2 },
  { name: "Ever Present", awardedHow: "Full Participation", awardedDesc: "Compete in every round of a championship.", rarity: 2 },
  { name: "Improvement", awardedHow: "Improved Position", awardedDesc: "Finish higher than your previous season.", rarity: 2 },
  { name: "Great Escape", awardedHow: "Survived Relegation", awardedDesc: "Avoid relegation after being in danger.", rarity: 2 },
  { name: "Century", awardedHow: "100 Rounds Played", awardedDesc: "Participate in 100 rounds total.", rarity: 2 },
  { name: "MIA", awardedHow: "7 Missed Bets", awardedDesc: "Miss placing a bet for 7 consecutive rounds.", rarity: 2 },
  { name: "Perfect Attendance", awardedHow: "Never Missed a Bet", awardedDesc: "Place a bet in every round of a championship.", rarity: 2 },
  { name: "Late Bloomer", awardedHow: "Won After Joining Late", awardedDesc: "Win a round after joining mid-season.", rarity: 2 },
  { name: "Steady Eddie", awardedHow: "Same Position 5 Rounds", awardedDesc: "Maintain the same position for 5 consecutive rounds.", rarity: 2 },
  { name: "Veteran", awardedHow: "Veteran", awardedDesc: "Compete in 5+ championships.", rarity: 2 },
  { name: "OG", awardedHow: "Founding Member", awardedDesc: "Compete in the first season of a championship.", rarity: 2 },
  { name: "Elder Statesman", awardedHow: "Oldest Driver Win", awardedDesc: "Win with the oldest driver on the grid.", rarity: 2 },
  { name: "Youth Movement", awardedHow: "Youngest Driver Win", awardedDesc: "Win with the youngest driver on the grid.", rarity: 2 },
  { name: "High Rise", awardedHow: "Tallest Driver Win", awardedDesc: "Win with the tallest driver on the grid.", rarity: 2 },
  { name: "Pocket Rocket", awardedHow: "Shortest Driver Win", awardedDesc: "Win with the shortest driver on the grid.", rarity: 2 },
  { name: "Heavy Hitter", awardedHow: "Heaviest Driver Win", awardedDesc: "Win with the heaviest driver on the grid.", rarity: 2 },
  { name: "Featherweight", awardedHow: "Lightest Driver Win", awardedDesc: "Win with the lightest driver on the grid.", rarity: 2 },
  { name: "Pole Position", awardedHow: "Pole Position Win", awardedDesc: "Win with the driver who finished P1 (pole).", rarity: 2 },
  { name: "Variety Pack", awardedHow: "6 Different Drivers", awardedDesc: "Bet on 6 different drivers in 6 consecutive rounds.", rarity: 2 },
  { name: "Against the Odds", awardedHow: "Outside Top 10 Win", awardedDesc: "Win with a driver who finished outside the top 10.", rarity: 2 },
  { name: "DNF Disappointment", awardedHow: "DNF Driver Bet", awardedDesc: "Bet on a driver who did not finish (DNF).", rarity: 2 },
  { name: "Super Fan", awardedHow: "Same Driver x5", awardedDesc: "Bet on the same driver for 5 consecutive rounds.", rarity: 2 },
  { name: "Rookie Backer", awardedHow: "Rookie Driver Win", awardedDesc: "Win with a rookie driver.", rarity: 2 },
  { name: "Old Guard", awardedHow: "Veteran Driver Win", awardedDesc: "Win with a driver in their 10th+ season.", rarity: 2 },
  { name: "Champion Picker", awardedHow: "Champion Driver Win", awardedDesc: "Win with a world champion driver.", rarity: 2 },
  { name: "Midfield Master", awardedHow: "Midfield Master", awardedDesc: "Win with a driver from a midfield team.", rarity: 2 },
  { name: "Global Winner", awardedHow: "Non-European Driver Win", awardedDesc: "Win with a non-European driver.", rarity: 2 },
  { name: "Fresh Face", awardedHow: "Debutant Bet", awardedDesc: "Bet on a driver making their debut.", rarity: 2 },
  { name: "Hat Trick", awardedHow: "3 Win Streak", awardedDesc: "Win 3 rounds in a row.", rarity: 2 },
  { name: "Hot Streak", awardedHow: "6 Points Streak", awardedDesc: "Score points in 6 consecutive rounds.", rarity: 2 },
  { name: "On Fire", awardedHow: "8 Points Streak", awardedDesc: "Score points in 8 consecutive rounds.", rarity: 2 },
  { name: "Frozen", awardedHow: "5 No Points Streak", awardedDesc: "Score no points for 5 consecutive rounds.", rarity: 2 },
  { name: "Podium Machine", awardedHow: "Podium Streak x3", awardedDesc: "Finish on podium 3 rounds in a row.", rarity: 2 },
  { name: "Consistent Five", awardedHow: "Top 5 Streak x5", awardedDesc: "Finish in top 5 for 5 consecutive rounds.", rarity: 2 },
  { name: "Golden Pick", awardedHow: "Same Driver Points x3", awardedDesc: "Score points with same driver 3 times in a row.", rarity: 2 },
  { name: "Oasis", awardedHow: "Points After 6 Dry", awardedDesc: "Score points after 6 rounds without any.", rarity: 2 },
  { name: "Roller Coaster", awardedHow: "Podium to Last", awardedDesc: "Go from podium to last place in consecutive rounds.", rarity: 2 },
  { name: "Rocket Ship", awardedHow: "Gained 5+ Positions", awardedDesc: "Gain 5+ positions in standings in one round.", rarity: 2 },
  { name: "Crash Landing", awardedHow: "Top 5 to Bottom", awardedDesc: "Go from top 5 to bottom 3 in one round.", rarity: 2 },
  { name: "Dark Horse", awardedHow: "Won From Last Place", awardedDesc: "Win a round while in last place in standings.", rarity: 2 },
  { name: "Zero Hero", awardedHow: "Won After Scoring Zero", awardedDesc: "Win despite scoring 0 in the previous round.", rarity: 2 },
  { name: "All or Nothing", awardedHow: "All or Nothing", awardedDesc: "Either win or finish last (no middle).", rarity: 2 },
  { name: "Always Second", awardedHow: "Runner-Up 5x in Season", awardedDesc: "Finish second place 5 times in one season.", rarity: 2 },
  { name: "Young Gun", awardedHow: "Under 22 Driver Win", awardedDesc: "Win with a driver younger than 22.", rarity: 2 },
  { name: "Nice", awardedHow: "Nice", awardedDesc: "Have exactly 69 total points.", rarity: 2 },

  // ============================================================================
  // EPIC (Rarity 3) - Significant achievement
  // ============================================================================
  { name: "Perfect Ten", awardedHow: "10 Round Wins", awardedDesc: "Win 10 rounds in a championship.", rarity: 3 },
  { name: "Seven Time Bridesmaid", awardedHow: "7x Runner-Up", awardedDesc: "Be runner-up 7 times in a championship.", rarity: 3 },
  { name: "Full House", awardedHow: "Full Field Win", awardedDesc: "Win when all competitors are betting.", rarity: 3 },
  { name: "Comeback King", awardedHow: "Comeback Win", awardedDesc: "Win after being last in the previous round.", rarity: 3 },
  { name: "Runaway Leader", awardedHow: "24 Point Lead", awardedDesc: "Be 24+ points ahead of second place.", rarity: 3 },
  { name: "Five-Way Tie", awardedHow: "Tied With 5", awardedDesc: "Have the same points as 5+ other competitors.", rarity: 3 },
  { name: "Rising Star", awardedHow: "Ascending Points", awardedDesc: "Score ascending points for 3 rounds (e.g., 1, 2, 3).", rarity: 3 },
  { name: "Century Points", awardedHow: "100 Points", awardedDesc: "Reach 100+ total points in a championship.", rarity: 3 },
  { name: "Century Club", awardedHow: "Century Club", awardedDesc: "Accumulate 100+ points across all seasons.", rarity: 3 },
  { name: "Complete Shutout", awardedHow: "0 Points Entire Season", awardedDesc: "Finish a championship with zero points.", rarity: 3 },
  { name: "Final Round Hero", awardedHow: "Final Round Clinch", awardedDesc: "Win the championship on the final round.", rarity: 3 },
  { name: "Double Century", awardedHow: "200 Rounds Played", awardedDesc: "Participate in 200 rounds total.", rarity: 3 },
  { name: "Ghost", awardedHow: "10 Missed Bets", awardedDesc: "Miss placing a bet for 10 consecutive rounds.", rarity: 3 },
  { name: "Legend", awardedHow: "Legend", awardedDesc: "Compete in 10+ championships.", rarity: 3 },
  { name: "Iron Man", awardedHow: "Never Missed 3 Seasons", awardedDesc: "Never miss a bet in 3 consecutive seasons.", rarity: 3 },
  { name: "Stache Cash", awardedHow: "Moustache Win", awardedDesc: "Win with a driver who has a moustache.", rarity: 3 },
  { name: "Business in Front", awardedHow: "Mullet Win", awardedDesc: "Win with a driver who has a mullet.", rarity: 3 },
  { name: "Giant Slayer", awardedHow: "Underdog Win", awardedDesc: "Win with a driver from the lowest-ranked team.", rarity: 3 },
  { name: "Diverse Portfolio", awardedHow: "10 Different Drivers", awardedDesc: "Bet on 10 different drivers in 10 consecutive rounds.", rarity: 3 },
  { name: "Completionist", awardedHow: "Bet on Every Driver", awardedDesc: "Bet on every driver on the grid at least once.", rarity: 3 },
  { name: "Backmarker Hero", awardedHow: "Backmarker Hero", awardedDesc: "Win with a driver from a backmarker team.", rarity: 3 },
  { name: "Farewell Bet", awardedHow: "Last Race Bet", awardedDesc: "Bet on a driver in their final race.", rarity: 3 },
  { name: "Quad Kill", awardedHow: "4 Win Streak", awardedDesc: "Win 4 rounds in a row.", rarity: 3 },
  { name: "Red Hot", awardedHow: "10 Points Streak", awardedDesc: "Score points in 10 consecutive rounds.", rarity: 3 },
  { name: "Arctic Cold", awardedHow: "7 No Points Streak", awardedDesc: "Score no points for 7 consecutive rounds.", rarity: 3 },
  { name: "Podium Domination", awardedHow: "Podium Streak x5", awardedDesc: "Finish on podium 5 rounds in a row.", rarity: 3 },
  { name: "Ride or Die", awardedHow: "Same Driver Points x4", awardedDesc: "Score points with same driver 4 times in a row.", rarity: 3 },
  { name: "Double Win Pick", awardedHow: "Same Driver Win x2", awardedDesc: "Win with same driver 2 times in a row.", rarity: 3 },
  { name: "Phoenix", awardedHow: "Win After Last", awardedDesc: "Win immediately after finishing last.", rarity: 3 },
  { name: "Catapult", awardedHow: "Last to Podium", awardedDesc: "Go from last to podium in consecutive rounds.", rarity: 3 },
  { name: "Long Drought Over", awardedHow: "Points After 9 Dry", awardedDesc: "Score points after 9 rounds without any.", rarity: 3 },
  { name: "Launchpad", awardedHow: "Bottom to Top 5", awardedDesc: "Go from bottom 3 to top 5 in one round.", rarity: 3 },
  { name: "Survivor", awardedHow: "Survivor", awardedDesc: "Recover to top half after being last.", rarity: 3 },
  { name: "Lone Scorer", awardedHow: "Only One to Score", awardedDesc: "Be the only competitor to score points in a round.", rarity: 3 },
  { name: "Giant Killer", awardedHow: "Beat Leader From Last", awardedDesc: "Beat the standings leader when in last place.", rarity: 3 },
  { name: "Veteran Victory", awardedHow: "Over 35 Driver Win", awardedDesc: "Win with a driver older than 35.", rarity: 3 },
  { name: "Hero to Zero", awardedHow: "1st to Last in One Round", awardedDesc: "Go from 1st place to last in a single round.", rarity: 3 },
  { name: "Dethroned", awardedHow: "Lost Title After Winning", awardedDesc: "Lose championship after winning previous season.", rarity: 3 },
  { name: "Double DNF", awardedHow: "DNF Twice in a Row", awardedDesc: "Bet on a driver who DNFs in two consecutive rounds.", rarity: 3 },
  { name: "Variety is Spice", awardedHow: "Never Same Driver Twice", awardedDesc: "Never bet same driver consecutively for 10+ rounds.", rarity: 3 },

  // ============================================================================
  // LEGENDARY (Rarity 4) - Exceptional
  // ============================================================================
  { name: "Fifteen Wins", awardedHow: "15 Round Wins", awardedDesc: "Win 15 rounds in a championship.", rarity: 4 },
  { name: "Champion", awardedHow: "Championship Win", awardedDesc: "Win a championship!", rarity: 4 },
  { name: "Early Bird", awardedHow: "Early Clinch", awardedDesc: "Clinch championship with 3+ rounds remaining.", rarity: 4 },
  { name: "Second to First", awardedHow: "Won Title After Runner-Up", awardedDesc: "Win after being runner-up the previous season.", rarity: 4 },
  { name: "Dominator", awardedHow: "Half Round Wins", awardedDesc: "Win at least half of all rounds in a championship.", rarity: 4 },
  { name: "Title Defender", awardedHow: "Title Defense", awardedDesc: "Successfully defend championship title.", rarity: 4 },
  { name: "Consistent Elite", awardedHow: "Consistent Top 5", awardedDesc: "Finish top 5 in 3 consecutive seasons.", rarity: 4 },
  { name: "Untouchable", awardedHow: "36 Point Lead", awardedDesc: "Be 36+ points ahead of second place.", rarity: 4 },
  { name: "150 Club", awardedHow: "150 Points", awardedDesc: "Reach 150+ total points in a championship.", rarity: 4 },
  { name: "200 Club", awardedHow: "200 Points", awardedDesc: "Reach 200+ total points in a championship.", rarity: 4 },
  { name: "500 Club", awardedHow: "500 Rounds Played", awardedDesc: "Participate in 500 rounds total.", rarity: 4 },
  { name: "Ultimate Fan", awardedHow: "Same Driver x10", awardedDesc: "Bet on the same driver for 10 consecutive rounds.", rarity: 4 },
  { name: "Penta Kill", awardedHow: "5 Win Streak", awardedDesc: "Win 5 rounds in a row.", rarity: 4 },
  { name: "Fifteen Straight", awardedHow: "15 Points Streak", awardedDesc: "Score points in 15 consecutive rounds.", rarity: 4 },
  { name: "Perfect Season", awardedHow: "Full Points Streak", awardedDesc: "Score points in every round of a championship.", rarity: 4 },
  { name: "Eternal Cold", awardedHow: "10 No Points Streak", awardedDesc: "Score no points for 10 consecutive rounds.", rarity: 4 },
  { name: "Elite Streak", awardedHow: "Top 5 Streak x10", awardedDesc: "Finish in top 5 for 10 consecutive rounds.", rarity: 4 },
  { name: "Triple Win Pick", awardedHow: "Same Driver Win x3", awardedDesc: "Win with same driver 3 times in a row.", rarity: 4 },
  { name: "Desert Rain", awardedHow: "Points After 12 Dry", awardedDesc: "Score points after 12 rounds without any.", rarity: 4 },
  { name: "Redemption Arc", awardedHow: "Redemption Arc", awardedDesc: "Win after 10+ pointless rounds.", rarity: 4 },
  { name: "Ultimate Comeback", awardedHow: "Last to 1st in One Round", awardedDesc: "Go from last place to 1st in a single round.", rarity: 4 },
  { name: "Photo Finish Champ", awardedHow: "Championship Won by 1 Point", awardedDesc: "Win championship with just 1 point margin.", rarity: 4 },
  { name: "Dominant Champion", awardedHow: "Championship Won by 30+ Points", awardedDesc: "Win championship with 30+ point margin.", rarity: 4 },
  { name: "Patience Pays", awardedHow: "First Championship After 5+ Seasons", awardedDesc: "First title win after competing 5+ seasons.", rarity: 4 },
  { name: "Complete Ghost", awardedHow: "Missed Entire Season", awardedDesc: "Miss every bet in a championship.", rarity: 4 },

  // ============================================================================
  // MYTHIC (Rarity 5) - Almost impossible
  // ============================================================================
  { name: "Twenty Wins", awardedHow: "20 Round Wins", awardedDesc: "Win 20 rounds in a championship.", rarity: 5 },
  { name: "Back to Back", awardedHow: "Back-to-Back Champ", awardedDesc: "Win 2 championships in a row.", rarity: 5 },
  { name: "Triple Crown", awardedHow: "Hat Trick Champ", awardedDesc: "Win 3 championships.", rarity: 5 },
  { name: "Dynasty", awardedHow: "Dynasty", awardedDesc: "Win 3 championships in a row.", rarity: 5 },
  { name: "Wire to Wire", awardedHow: "Wire-to-Wire Lead", awardedDesc: "Lead the championship from round 1 to end.", rarity: 5 },
  { name: "Party in Back", awardedHow: "Moustache & Mullet", awardedDesc: "Win with a driver who has BOTH moustache and mullet.", rarity: 5 },
  { name: "Magnificent Seven", awardedHow: "7 Win Streak", awardedDesc: "Win 7 rounds in a row.", rarity: 5 },
  { name: "Quad Win Pick", awardedHow: "Same Driver Win x4", awardedDesc: "Win with same driver 4 times in a row.", rarity: 5 },
  { name: "Impossible Dream", awardedHow: "Impossible Comeback", awardedDesc: "Win championship after being last at halfway point.", rarity: 5 },
  { name: "One Driver Season", awardedHow: "Same Driver All Season", awardedDesc: "Bet on same driver for entire championship.", rarity: 5 },
  { name: "Rookie Champion", awardedHow: "Won Championship First Season", awardedDesc: "Win championship in your debut season.", rarity: 5 },
  { name: "Always the Bridesmaid", awardedHow: "Always Bridesmaid Never Bride", awardedDesc: "Finish runner-up in 3 consecutive seasons.", rarity: 5 },
]

// Get rarity by awardedHow string.
export const getRarityByHow = (awardedHow: string): number => {
  const outcome = badgeRewardOutcomes.find(
    (outcome: badgeOutcomeType) => outcome.awardedHow === awardedHow,
  )
  return outcome?.rarity ?? 0
}

// Get badge outcome by awardedHow string.
export const getOutcomeByHow = (awardedHow: string): badgeOutcomeType | undefined => {
  return badgeRewardOutcomes.find(
    (outcome: badgeOutcomeType) => outcome.awardedHow === awardedHow,
  )
}

export type badgeRarityType = {
  rarity: number
  rarityName: string
  colour: string
}

// Returns array of rarity objects with name and colour.
export const badgeRarities = () => {
  const rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]

  return rarities.map((rarityName: string, i: number) => {
    return {
      rarity: i,
      rarityName,
      colour: getBadgeColour(i),
    }
  })
}
