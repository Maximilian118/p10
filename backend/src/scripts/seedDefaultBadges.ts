// Seed script to populate the database with default badges.
// Run with: npx ts-node src/scripts/seedDefaultBadges.ts
// Or compile first: npx tsc && node dist/scripts/seedDefaultBadges.js

import mongoose from "mongoose"
import dotenv from "dotenv"
import Badge from "../models/badge"
import { createLogger } from "../shared/logger"

dotenv.config()

const log = createLogger("SeedBadges")

// Convert "Round Win" to "round_win" for S3 filename.
// Handles hyphens (Runner-Up → runner_up), plus signs (5+ → 5_plus), and percent (5% → 5_pct).
const toSnakeCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\+/g, "_plus")
    .replace(/%/g, "_pct")

// Construct the S3 URL for a badge image.
const getS3Url = (awardedHow: string): string => {
  const bucket = process.env.AWS_BUCKET || "p10-game"
  const region = process.env.AWS_REGION || "eu-west-2"
  const filename = toSnakeCase(awardedHow)
  return `http://${bucket}.s3.${region}.amazonaws.com/assets/badges/${filename}.webp`
}

// Badge definition shape for the seed array.
interface SeedBadge {
  name: string
  awardedHow: string
  awardedDesc: string
  rarity: number
}

// 88 default badges organized by rarity.
// awardedHow must match evaluator registry keys AND badgeOutcomes.ts entries exactly.
const defaultBadges: SeedBadge[] = [
  // ===========================================================================
  // COMMON (Rarity 0) — 20 badges
  // ===========================================================================
  { name: "Victor", awardedHow: "Round Win", awardedDesc: "Win a round in a championship.", rarity: 0 },
  { name: "Second Best", awardedHow: "Round Runner-Up", awardedDesc: "Finish as runner-up in a round.", rarity: 0 },
  { name: "Podium Sitter", awardedHow: "Round Podium", awardedDesc: "Finish in the top 3 of a round.", rarity: 0 },
  { name: "High Five", awardedHow: "Round Top 5", awardedDesc: "Finish in the top 5 of a round.", rarity: 0 },
  { name: "Back Marker", awardedHow: "Round Last", awardedDesc: "Finish last in a round.", rarity: 0 },
  { name: "Off the Mark", awardedHow: "Season 5%", awardedDesc: "Earn 5% of total earnable season points.", rarity: 0 },
  { name: "Welcome Aboard", awardedHow: "Joined Championship", awardedDesc: "Join a championship.", rarity: 0 },
  { name: "Upper Half", awardedHow: "Top Half Finish", awardedDesc: "Finish in the top half of standings.", rarity: 0 },
  { name: "Lower Half", awardedHow: "Bottom Half Finish", awardedDesc: "Finish in the bottom half of standings.", rarity: 0 },
  { name: "Blanked", awardedHow: "No Points", awardedDesc: "Score no points in a round.", rarity: 0 },
  { name: "Solo Point", awardedHow: "Single Point", awardedDesc: "Score exactly 1 point in a round.", rarity: 0 },
  { name: "Deuce", awardedHow: "Two Points", awardedDesc: "Score exactly 2 points in a round.", rarity: 0 },
  { name: "Heartbreaker", awardedHow: "Lost by 1 Point", awardedDesc: "Lose by exactly 1 point.", rarity: 0 },
  { name: "Nail Biter", awardedHow: "Won by 1 Point", awardedDesc: "Win by exactly 1 point.", rarity: 0 },
  { name: "Switcheroo", awardedHow: "Switcheroo", awardedDesc: "Change your bet driver 3+ times in one betting window.", rarity: 0 },
  { name: "Slacker", awardedHow: "Missed Bet", awardedDesc: "Miss placing a bet for 1 round.", rarity: 0 },
  { name: "Participation Trophy", awardedHow: "Participation Trophy", awardedDesc: "Finish last with some points.", rarity: 0 },
  { name: "Lucky Number", awardedHow: "Lucky Number", awardedDesc: "Have exactly 7, 13, or 21 total points.", rarity: 0 },
  { name: "Getting Started", awardedHow: "10 Rounds Played", awardedDesc: "Participate in 10 rounds total.", rarity: 0 },
  { name: "Wooden Spoon", awardedHow: "Championship Last", awardedDesc: "Finish last in a championship.", rarity: 0 },

  // ===========================================================================
  // UNCOMMON (Rarity 1) — 20 badges
  // ===========================================================================
  { name: "Double Victor", awardedHow: "2 Round Wins", awardedDesc: "Win 2 rounds in a championship.", rarity: 1 },
  { name: "Triple Threat", awardedHow: "3 Round Wins", awardedDesc: "Win 3 rounds in a championship.", rarity: 1 },
  { name: "Breakthrough", awardedHow: "First Win Ever", awardedDesc: "Win your first ever round.", rarity: 1 },
  { name: "Fast Starter", awardedHow: "First Round Win", awardedDesc: "Win the first round of a championship.", rarity: 1 },
  { name: "Near Miss Win", awardedHow: "Won With P9 or P11", awardedDesc: "Win by betting on P9 or P11.", rarity: 1 },
  { name: "Gaining Traction", awardedHow: "Season 10%", awardedDesc: "Earn 10% of total earnable season points.", rarity: 1 },
  { name: "Double Down", awardedHow: "2 Win Streak", awardedDesc: "Win 2 rounds in a row.", rarity: 1 },
  { name: "Loyal Fan", awardedHow: "Same Driver x3", awardedDesc: "Bet on the same driver for 3 consecutive rounds.", rarity: 1 },
  { name: "Cold Streak", awardedHow: "3 No Points Streak", awardedDesc: "Score no points for 3 consecutive rounds.", rarity: 1 },
  { name: "Freefall", awardedHow: "Dropped 5+ Positions", awardedDesc: "Drop 5+ positions in standings in one round.", rarity: 1 },
  { name: "Pole Position", awardedHow: "Pole Position Win", awardedDesc: "Win with the driver who took pole position (P1 in qualifying).", rarity: 1 },
  { name: "Front Row Bet", awardedHow: "Front Row Bet", awardedDesc: "Win by betting on a driver who qualified in the top 3.", rarity: 1 },
  { name: "One Off", awardedHow: "Bet on P9 or P11", awardedDesc: "Bet on a driver who finished P9 or P11 (one off from P10).", rarity: 1 },
  { name: "DNF Disappointment", awardedHow: "DNF Driver Bet", awardedDesc: "Bet on a driver who didn't complete their qualifying lap.", rarity: 1 },
  { name: "Odd One Out", awardedHow: "Everyone Scored Except You", awardedDesc: "Score 0 when all other competitors scored.", rarity: 1 },
  { name: "Drought Breaker", awardedHow: "Points After 3 Dry", awardedDesc: "Score points after 3 rounds without any.", rarity: 1 },
  { name: "Rule Enforcer", awardedHow: "Gave Points Penalty", awardedDesc: "Give a points penalty to a competitor as adjudicator.", rarity: 1 },
  { name: "Generous Judge", awardedHow: "Gave Points Bonus", awardedDesc: "Give a points bonus to a competitor as adjudicator.", rarity: 1 },
  { name: "Teacher's Pet", awardedHow: "Received Points Bonus", awardedDesc: "Receive a points bonus from the adjudicator.", rarity: 1 },
  { name: "Penalized", awardedHow: "Received Points Penalty", awardedDesc: "Receive a points penalty from the adjudicator.", rarity: 1 },

  // ===========================================================================
  // RARE (Rarity 2) — 18 badges
  // ===========================================================================
  { name: "Fab Five", awardedHow: "5 Round Wins", awardedDesc: "Win 5 rounds in a championship.", rarity: 2 },
  { name: "Strong Finisher", awardedHow: "Final Round Win", awardedDesc: "Win the last round of a championship.", rarity: 2 },
  { name: "In the Points", awardedHow: "Season 20%", awardedDesc: "Earn 20% of total earnable season points.", rarity: 2 },
  { name: "One Third Distance", awardedHow: "Season 33%", awardedDesc: "Earn 33% of total earnable season points.", rarity: 2 },
  { name: "Podium Finish", awardedHow: "Championship Top 3", awardedDesc: "Finish in the top 3 of a championship.", rarity: 2 },
  { name: "Silver Medal", awardedHow: "Championship Runner-Up", awardedDesc: "Finish second in a championship.", rarity: 2 },
  { name: "Bronze Medal", awardedHow: "Championship Bronze", awardedDesc: "Finish third in a championship.", rarity: 2 },
  { name: "Perfect Attendance", awardedHow: "Never Missed a Bet", awardedDesc: "Place a bet in every round of a championship.", rarity: 2 },
  { name: "Hat Trick", awardedHow: "3 Win Streak", awardedDesc: "Win 3 rounds in a row.", rarity: 2 },
  { name: "Hot Streak", awardedHow: "6 Points Streak", awardedDesc: "Score points in 6 consecutive rounds.", rarity: 2 },
  { name: "On Fire", awardedHow: "8 Points Streak", awardedDesc: "Score points in 8 consecutive rounds.", rarity: 2 },
  { name: "Lone Wolf", awardedHow: "Lone Wolf", awardedDesc: "Win when you were the last person to place your bet.", rarity: 2 },
  { name: "Perfect P10", awardedHow: "Perfect P10", awardedDesc: "Bet on the exact P10 finisher.", rarity: 2 },
  { name: "Zero Hero", awardedHow: "Won After Scoring Zero", awardedDesc: "Win despite scoring 0 in the previous round.", rarity: 2 },
  { name: "Rocket Ship", awardedHow: "Gained 5+ Positions", awardedDesc: "Gain 5+ positions in standings in one round.", rarity: 2 },
  { name: "Nice", awardedHow: "Nice", awardedDesc: "Have exactly 69 total points.", rarity: 2 },
  { name: "In Charge", awardedHow: "Became Adjudicator", awardedDesc: "Become the adjudicator of a championship.", rarity: 2 },
  { name: "Passing the Torch", awardedHow: "Passed Adjudicator", awardedDesc: "Pass your adjudicator role to another competitor.", rarity: 2 },

  // ===========================================================================
  // EPIC (Rarity 3) — 10 badges
  // ===========================================================================
  { name: "Perfect Ten", awardedHow: "10 Round Wins", awardedDesc: "Win 10 rounds in a championship.", rarity: 3 },
  { name: "Half Distance", awardedHow: "Season 50%", awardedDesc: "Earn 50% of total earnable season points.", rarity: 3 },
  { name: "Lone Scorer", awardedHow: "Only One to Score", awardedDesc: "Be the only competitor to score points in a round.", rarity: 3 },
  { name: "Cold Pick", awardedHow: "Cold Pick", awardedDesc: "Win with a driver whose recent form is in the bottom 3.", rarity: 3 },
  { name: "Double DNF", awardedHow: "DNF Twice in a Row", awardedDesc: "Bet on a driver who didn't complete qualifying in two consecutive rounds.", rarity: 3 },
  { name: "Backmarker Hero", awardedHow: "Backmarker Hero", awardedDesc: "Win with a driver from a backmarker team.", rarity: 3 },
  { name: "Giant Killer", awardedHow: "Beat Leader From Last", awardedDesc: "Beat the standings leader when in last place.", rarity: 3 },
  { name: "Rising Star", awardedHow: "Ascending Points", awardedDesc: "Score ascending points for 3 rounds (e.g., 1, 2, 3).", rarity: 3 },
  { name: "Ban Hammer", awardedHow: "Banned Competitor", awardedDesc: "Ban a competitor from the championship.", rarity: 3 },
  { name: "Survivor", awardedHow: "Survivor", awardedDesc: "Recover to top half after being last.", rarity: 3 },

  // ===========================================================================
  // LEGENDARY (Rarity 4) — 10 badges
  // ===========================================================================
  { name: "Champion", awardedHow: "Championship Win", awardedDesc: "Win a championship!", rarity: 4 },
  { name: "Title Defender", awardedHow: "Title Defense", awardedDesc: "Successfully defend championship title.", rarity: 4 },
  { name: "Perfect Season", awardedHow: "Full Points Streak", awardedDesc: "Score points in every round of a championship.", rarity: 4 },
  { name: "Stache Cash", awardedHow: "Moustache Win", awardedDesc: "Win with a driver who has a moustache.", rarity: 4 },
  { name: "Business in Front", awardedHow: "Mullet Win", awardedDesc: "Win with a driver who has a mullet.", rarity: 4 },
  { name: "Penta Kill", awardedHow: "5 Win Streak", awardedDesc: "Win 5 rounds in a row.", rarity: 4 },
  { name: "Ultimate Comeback", awardedHow: "Last to 1st in One Round", awardedDesc: "Go from last place to 1st in a single round.", rarity: 4 },
  { name: "Photo Finish Champ", awardedHow: "Championship Won by 1 Point", awardedDesc: "Win championship with just 1 point margin.", rarity: 4 },
  { name: "Dominant Champion", awardedHow: "Championship Won by 30+ Points", awardedDesc: "Win championship with 30+ point margin.", rarity: 4 },
  { name: "Bouncer", awardedHow: "Kicked Competitor", awardedDesc: "Kick a competitor from the championship.", rarity: 4 },

  // ===========================================================================
  // MYTHIC (Rarity 5) — 10 badges
  // ===========================================================================
  { name: "Wire to Wire", awardedHow: "Wire-to-Wire Lead", awardedDesc: "Lead the championship from round 1 to end.", rarity: 5 },
  { name: "Impossible Dream", awardedHow: "Impossible Comeback", awardedDesc: "Win championship after being last at halfway point.", rarity: 5 },
  { name: "Dynasty", awardedHow: "Dynasty", awardedDesc: "Win 3 championships in a row.", rarity: 5 },
  { name: "Rookie Champion", awardedHow: "Won Championship First Season", awardedDesc: "Win championship in your debut season.", rarity: 5 },
  { name: "Twenty Wins", awardedHow: "20 Round Wins", awardedDesc: "Win 20 rounds in a championship.", rarity: 5 },
  { name: "Triple Crown", awardedHow: "Hat Trick Champ", awardedDesc: "Win 3 championships.", rarity: 5 },
  { name: "Party in Back", awardedHow: "Moustache & Mullet", awardedDesc: "Win with a driver who has BOTH moustache and mullet.", rarity: 5 },
  { name: "Quad Win Pick", awardedHow: "Same Driver Win x4", awardedDesc: "Win with same driver 4 times in a row.", rarity: 5 },
  { name: "One Driver Season", awardedHow: "Same Driver All Season", awardedDesc: "Bet on same driver for entire championship.", rarity: 5 },
  { name: "Always the Bridesmaid", awardedHow: "Always Bridesmaid Never Bride", awardedDesc: "Finish runner-up in 3 consecutive seasons.", rarity: 5 },
]

// Main seed function.
const seedDefaultBadges = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/p10_game"

  try {
    log.info("Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)
    log.info("Connected to MongoDB.")

    // Delete any existing default badges before seeding (makes script idempotent).
    const existingCount = await Badge.countDocuments({ isDefault: true })
    if (existingCount > 0) {
      log.info(`Deleting ${existingCount} existing default badges...`)
      await Badge.deleteMany({ isDefault: true })
      log.info("Deleted existing default badges.")
    }

    log.info(`Seeding ${defaultBadges.length} default badges...`)

    // Create badge documents with S3 URLs and default flags.
    const badgeDocs = defaultBadges.map((badge) => ({
      ...badge,
      url: getS3Url(badge.awardedHow),
      championship: null,
      isDefault: true,
      zoom: 100,
      awardedTo: [],
    }))

    // Insert all badges.
    const result = await Badge.insertMany(badgeDocs)
    log.info(`Successfully created ${result.length} default badges.`)

    // Log breakdown by rarity.
    const rarityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]
    const rarityCounts = [0, 0, 0, 0, 0, 0]
    result.forEach((badge) => {
      rarityCounts[badge.rarity]++
    })

    log.info("Breakdown by rarity:")
    rarityNames.forEach((name, i) => {
      log.info(`  ${name}: ${rarityCounts[i]}`)
    })

    await mongoose.disconnect()
    log.info("Done!")
    process.exit(0)
  } catch (error) {
    log.error("Error seeding badges:", error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run the seed function.
seedDefaultBadges()
