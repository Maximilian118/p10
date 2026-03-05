// Production reset script — wipes all test data while preserving F1 series, drivers, teams, and default badges.
// Run with: npx ts-node src/scripts/resetForProduction.ts

import mongoose from "mongoose"
import dotenv from "dotenv"
import SocialComment from "../models/socialComment"
import SocialEvent from "../models/socialEvent"
import Protest from "../models/protest"
import League from "../models/league"
import Champ from "../models/champ"
import Badge from "../models/badge"
import User from "../models/user"
import EmailVerification from "../models/emailVerification"
import Series from "../models/series"
import Driver from "../models/driver"
import Team from "../models/team"
import { createLogger } from "../shared/logger"

dotenv.config()

const log = createLogger("ResetDB")

// Logs the result of a deleteMany operation.
const logDelete = (label: string, result: { deletedCount?: number }) => {
  log.info(`  ${label}: ${result.deletedCount ?? 0} deleted`)
}

// Logs the result of an updateMany operation.
const logUpdate = (label: string, result: { modifiedCount: number }) => {
  log.info(`  ${label}: ${result.modifiedCount} modified`)
}

const resetForProduction = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    log.error("MONGODB_URI not set in .env")
    process.exit(1)
  }

  try {
    await mongoose.connect(uri)
    log.info("Connected to MongoDB")

    // ── Step 1: Deletions ──────────────────────────────────────────
    log.info("Deleting test data...")

    logDelete("SocialComments", await SocialComment.deleteMany({}))
    logDelete("SocialEvents", await SocialEvent.deleteMany({}))
    logDelete("Protests", await Protest.deleteMany({}))
    logDelete("Leagues", await League.deleteMany({}))
    logDelete("Championships", await Champ.deleteMany({}))
    logDelete("Non-default Badges", await Badge.deleteMany({ isDefault: { $ne: true } }))
    logDelete("Users", await User.deleteMany({}))
    logDelete("EmailVerifications", await EmailVerification.deleteMany({}))
    logDelete("Non-F1 Series", await Series.deleteMany({ shortName: { $ne: "F1" } }))

    // ── Step 2: Clean up references in preserved data ──────────────
    log.info("Cleaning stale references...")

    // Clear the championships array on the F1 series (all champs were deleted).
    logUpdate("F1 Series championships[]", await Series.updateMany(
      { shortName: "F1" },
      { $set: { championships: [] } },
    ))

    // Remove references to deleted non-F1 series from drivers and teams.
    const f1Series = await Series.findOne({ shortName: "F1" })
    if (f1Series) {
      logUpdate("Driver series[] cleanup", await Driver.updateMany(
        {},
        { $pull: { series: { $ne: f1Series._id } } },
      ))
      logUpdate("Team series[] cleanup", await Team.updateMany(
        {},
        { $pull: { series: { $ne: f1Series._id } } },
      ))
    } else {
      log.warn("F1 series not found — skipping driver/team series cleanup")
    }

    // ── Step 3: Summary ────────────────────────────────────────────
    const remainingSeries = await Series.countDocuments()
    const remainingDrivers = await Driver.countDocuments()
    const remainingTeams = await Team.countDocuments()
    const remainingBadges = await Badge.countDocuments()

    log.info("Remaining data:")
    log.info(`  Series: ${remainingSeries}`)
    log.info(`  Drivers: ${remainingDrivers}`)
    log.info(`  Teams: ${remainingTeams}`)
    log.info(`  Default Badges: ${remainingBadges}`)

    await mongoose.disconnect()
    log.info("Done!")
    process.exit(0)
  } catch (error) {
    log.error("Reset failed:", error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run the reset.
resetForProduction()
