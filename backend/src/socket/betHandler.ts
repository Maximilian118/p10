import moment from "moment"
import { ObjectId } from "mongodb"
import Champ from "../models/champ"

// Result of an atomic bet placement attempt.
export interface BetResult {
  success: boolean
  previousDriverId: string | null
  reason?: "already_taken" | "betting_closed" | "not_competitor" | "invalid_round" | "not_found" | "same_driver"
  takenBy?: string
}

// Places a bet atomically, returning success/failure without throwing errors.
// This is used by both the socket handler and GraphQL resolver.
export const placeBetAtomic = async (
  champId: string,
  roundIndex: number,
  driverId: string,
  userId: string,
): Promise<BetResult> => {
  const champ = await Champ.findById(champId)
  if (!champ) {
    return { success: false, previousDriverId: null, reason: "not_found" }
  }

  // Validate round index.
  if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
    return { success: false, previousDriverId: null, reason: "invalid_round" }
  }

  const round = champ.rounds[roundIndex]

  // Validate round status is betting_open.
  if (round.status !== "betting_open") {
    return { success: false, previousDriverId: null, reason: "betting_closed" }
  }

  // Find the user's competitor entry in this round.
  const competitorIndex = round.competitors.findIndex(
    (c) => c.competitor.toString() === userId,
  )
  if (competitorIndex === -1) {
    return { success: false, previousDriverId: null, reason: "not_competitor" }
  }

  const competitor = round.competitors[competitorIndex]
  const previousDriverId = competitor.bet ? competitor.bet.toString() : null

  // If user is trying to bet on the same driver they already have, treat as success (no-op).
  if (previousDriverId === driverId) {
    return { success: true, previousDriverId, reason: "same_driver" }
  }

  // Check if the driver is already taken by another competitor.
  const otherCompetitorWithDriver = round.competitors.find(
    (c) => c.bet?.toString() === driverId && c.competitor.toString() !== userId,
  )

  if (otherCompetitorWithDriver) {
    return {
      success: false,
      previousDriverId,
      reason: "already_taken",
      takenBy: otherCompetitorWithDriver.competitor.toString(),
    }
  }

  // Atomic update to prevent race conditions.
  const driverObjectId = new ObjectId(driverId)
  const updateResult = await Champ.findOneAndUpdate(
    {
      _id: new ObjectId(champId),
      // Ensure the driver is still not taken by checking again in the query.
      [`rounds.${roundIndex}.competitors`]: {
        $not: {
          $elemMatch: {
            bet: driverObjectId,
            competitor: { $ne: new ObjectId(userId) },
          },
        },
      },
    },
    {
      $set: {
        [`rounds.${roundIndex}.competitors.${competitorIndex}.bet`]: driverObjectId,
        [`rounds.${roundIndex}.competitors.${competitorIndex}.updated_at`]: moment().format(),
        [`rounds.${roundIndex}.competitors.${competitorIndex}.created_at`]:
          competitor.created_at || moment().format(),
        updated_at: moment().format(),
      },
    },
    { new: true },
  )

  if (!updateResult) {
    // The atomic update failed - another user took the driver between check and update.
    // Re-fetch to find who took it.
    const freshChamp = await Champ.findById(champId)
    const takenByCompetitor = freshChamp?.rounds[roundIndex].competitors.find(
      (c) => c.bet?.toString() === driverId,
    )
    return {
      success: false,
      previousDriverId,
      reason: "already_taken",
      takenBy: takenByCompetitor?.competitor.toString(),
    }
  }

  return { success: true, previousDriverId }
}
