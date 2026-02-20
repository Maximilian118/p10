import { ObjectId } from "mongodb"
import User from "../models/user"
import SocialEvent, { SocialEventKind, SocialEventPayloadType } from "../models/socialEvent"

interface CreateSocialEventOptions {
  kind: SocialEventKind
  userId: ObjectId | string
  userSnapshot: { name: string; icon: string }
  payload?: Partial<SocialEventPayloadType>
}

// Maps badge rarity values to their corresponding settings keys.
const BADGE_RARITY_SETTINGS: Record<number, keyof import("../models/socialEvent").SocialEventSettingsType> = {
  3: "badge_earned_epic",
  4: "badge_earned_legendary",
  5: "badge_earned_mythic",
}

// Creates a SocialEvent if the user has the corresponding event kind enabled in their settings.
// Silently skips creation if the user has disabled this event type.
export async function createSocialEvent(options: CreateSocialEventOptions): Promise<void> {
  try {
    // Check if user has this event kind enabled in their socialEventSettings.
    const user = await User.findById(options.userId).select("socialEventSettings")
    if (!user) return

    // For badge events, check the per-rarity setting instead of a single toggle.
    const settings = user.socialEventSettings
    if (options.kind === "badge_earned") {
      const rarity = options.payload?.badgeRarity
      if (rarity !== undefined) {
        const settingKey = BADGE_RARITY_SETTINGS[rarity]
        if (settingKey && settings && settings[settingKey] === false) return
      }
    } else {
      // Check if the user has this specific event kind enabled.
      if (settings && (settings as unknown as Record<string, boolean>)[options.kind] === false) return
    }

    // Create and save the social event.
    const event = new SocialEvent({
      kind: options.kind,
      user: options.userId,
      userSnapshot: options.userSnapshot,
      payload: options.payload || {},
    })

    await event.save()
  } catch (error) {
    // Log but don't throw - social events should never block the main operation.
    console.error(`Failed to create social event (${options.kind}):`, error)
  }
}

// Points milestone thresholds.
export const POINTS_MILESTONES = [100, 500, 1000, 5000, 10000]

// Rounds milestone thresholds.
export const ROUNDS_MILESTONES = [10, 25, 50, 100, 250]

// Minimum win streak count to generate a social event.
export const MIN_WIN_STREAK = 3
