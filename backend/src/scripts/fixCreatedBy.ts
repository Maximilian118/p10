// Reassigns all created_by references on Drivers, Teams, and Series to the sole user in the database.
// Run with: npx ts-node src/scripts/fixCreatedBy.ts

import mongoose from "mongoose"
import dotenv from "dotenv"
import User from "../models/user"
import Driver from "../models/driver"
import Team from "../models/team"
import Series from "../models/series"
import { createLogger } from "../shared/logger"

dotenv.config()

const log = createLogger("FixRefs")

const fixCreatedBy = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    log.error("MONGODB_URI not set in .env")
    process.exit(1)
  }

  try {
    await mongoose.connect(uri)
    log.info("Connected to MongoDB")

    // Find the only user in the database.
    const user = await User.findOne()
    if (!user) {
      log.error("No user found in the database — register an account first")
      process.exit(1)
    }

    log.info(`Found user: ${user.name} (${user._id})`)

    // Update all created_by references to point to this user.
    const drivers = await Driver.updateMany({}, { $set: { created_by: user._id } })
    log.info(`Drivers updated: ${drivers.modifiedCount}`)

    const teams = await Team.updateMany({}, { $set: { created_by: user._id } })
    log.info(`Teams updated: ${teams.modifiedCount}`)

    const series = await Series.updateMany({}, { $set: { created_by: user._id } })
    log.info(`Series updated: ${series.modifiedCount}`)

    await mongoose.disconnect()
    log.info("Done!")
    process.exit(0)
  } catch (error) {
    log.error("Failed:", error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

fixCreatedBy()
