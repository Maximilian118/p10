import mongoose from "mongoose"
import dotenv from "dotenv"
import { createLogger } from "../shared/logger"

dotenv.config()

const log = createLogger("Migration")

// Migration script: Converts series.url to series.icon + series.profile_picture.
// Copies the existing url value into both icon and profile_picture fields,
// then removes the url field from each document.
const migrateSeriesUrl = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/p10_game"

  try {
    await mongoose.connect(MONGODB_URI)
    log.info("Connected to MongoDB")

    const db = mongoose.connection.db
    if (!db) {
      throw new Error("Database connection not available")
    }
    const collection = db.collection("series")

    // Find all series documents that still have the url field.
    const seriesWithUrl = await collection.find({ url: { $exists: true } }).toArray()
    log.info(`Found ${seriesWithUrl.length} series documents with 'url' field`)

    let updated = 0
    for (const series of seriesWithUrl) {
      await collection.updateOne(
        { _id: series._id },
        {
          $set: {
            icon: series.url,
            profile_picture: series.url,
          },
          $unset: { url: "" },
        },
      )
      updated++
      log.info(`Migrated: ${series.name} (${series._id})`)
    }

    log.info(`Migration complete. Updated ${updated} documents.`)
  } catch (err) {
    log.error("Migration failed:", err)
  } finally {
    await mongoose.disconnect()
    log.info("Disconnected from MongoDB")
  }
}

migrateSeriesUrl()
