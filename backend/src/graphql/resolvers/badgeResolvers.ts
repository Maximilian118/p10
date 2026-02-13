import { AuthRequest } from "../../middleware/auth"
import Badge, { badgeResponseType, badgeType } from "../../models/badge"
import Champ from "../../models/champ"
import User, { userTypeMongo, userBadgeSnapshotType } from "../../models/user"
import { ObjectId } from "mongodb"
import {
  badgeAwardedDescErrors,
  badgeAwardedHowErrors,
  badgeChampErrors,
  badgeCustomNameErrors,
  badgeDuplicateErrors,
  badgeNameErrors,
  badgeRarityErrors,
  badgeURLErrors,
  badgeZoomErrors,
  throwError,
  userErrors,
} from "./resolverErrors"
import moment from "moment"
import badgeRewardOutcomes, { findDesc } from "../../shared/badgeOutcomes"
import { clientS3, deleteS3 } from "../../shared/utility"
import { sendNotification } from "../../shared/notifications"
import { createLogger } from "../../shared/logger"

const log = createLogger("BadgeResolver")

const badgeResolvers = {
  newBadge: async (args: { badgeInput: badgeType }, req: AuthRequest): Promise<badgeType> => {
    if (!req.isAuth) {
      throwError("newBadge", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { url, name, customName, rarity, awardedHow, awardedDesc, zoom, championship, isDefault } = args.badgeInput
      const user = (await User.findById(req._id)) as userTypeMongo

      // Check for errors.
      userErrors(user)
      badgeURLErrors(url)
      badgeNameErrors(name)
      badgeCustomNameErrors(customName)
      badgeAwardedHowErrors(awardedHow)
      badgeAwardedDescErrors(awardedHow, awardedDesc)
      badgeRarityErrors(rarity)
      badgeZoomErrors(zoom)
      badgeChampErrors(championship)
      await badgeDuplicateErrors(args.badgeInput)

      // If badge has a championship, check authorization.
      if (championship) {
        const champ = await Champ.findById(championship)
        if (champ) {
          const isAdmin = user?.permissions?.admin === true
          const isAdjudicator = champ.adjudicator.current.toString() === req._id?.toString()

          // Only adjudicator or admin can create badges for a championship.
          if (!isAdmin && !isAdjudicator) {
            return throwError("newBadge", req._id, "Only adjudicator or admin can create badges!", 403)
          }
        }
      }

      // Create a new badge DB object.
      const badge = new Badge({
        url,
        name,
        customName: customName || undefined,
        rarity,
        awardedHow,
        awardedDesc,
        zoom,
        championship,
        isDefault: isDefault || false,
      })

      // Save the new badge to the DB.
      await badge.save()

      // If badge has a championship, add badge ID to championship's champBadges array.
      if (championship) {
        const updatedChamp = await Champ.findByIdAndUpdate(
          championship,
          { $push: { champBadges: badge._id } },
          { new: true }
        )

        // Update user championship snapshots with new badge count.
        const totalBadges = updatedChamp?.champBadges?.length || 0

        await User.updateMany(
          { "championships._id": championship },
          {
            $set: {
              "championships.$.totalBadges": totalBadges,
              "championships.$.updated_at": moment().format(),
            },
          }
        )
      }

      // Return the new badge with tokens.
      return {
        ...badge._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  getBadgesByChamp: async (
    { championship }: { championship: ObjectId | null },
    req: AuthRequest,
  ): Promise<{
    array: badgeResponseType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getBadgesByChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo

      // Check for errors.
      userErrors(user)

      // Find badges - if no championship provided, return default badges.
      let badges: badgeType[] = []
      let isAdmin = false
      let isAdjudicator = false
      let champ = null

      if (championship === null) {
        // Default badges are templates - show full info to everyone.
        badges = await Badge.find({ isDefault: true }).exec()
        isAdjudicator = true
      } else {
        // Find the championship and get badges by IDs in champBadges array.
        // This includes both default badges (referenced) and custom badges (created for this champ).
        champ = await Champ.findById(championship)
        if (champ && champ.champBadges && champ.champBadges.length > 0) {
          badges = await Badge.find({ _id: { $in: champ.champBadges } }).exec()
        } else {
          badges = []
        }

        // Check if user is admin or the current adjudicator of this championship.
        if (champ) {
          isAdmin = user?.permissions?.admin === true
          isAdjudicator = champ.adjudicator.current.toString() === req._id?.toString()
        }
      }

      // Check if adjudicator can see hidden badges (admin setting).
      const adjCanSeeBadges = champ?.settings?.admin?.adjCanSeeBadges ?? true

      // Filter sensitive fields for unearned badges.
      // Discovery tracking is per-championship via champ.discoveredBadges array.
      const filteredBadges = badges.map((badge) => {
        const badgeDoc = badge._doc
        // Check if badge has been discovered in this championship.
        const hasBeenEarned = champ?.discoveredBadges?.some(
          (d) => d.badge.toString() === badgeDoc._id.toString()
        ) || false

        // If badge has been earned OR user is admin OR (user is adjudicator AND setting allows), return full badge.
        if (hasBeenEarned || isAdmin || (isAdjudicator && adjCanSeeBadges)) {
          return {
            ...badgeDoc,
          }
        }

        // Otherwise, hide sensitive fields.
        return {
          ...badgeDoc,
          url: null,
          name: null,
          customName: null,
          awardedHow: null,
          awardedDesc: null,
        }
      })

      // Return badges with tokens.
      return {
        array: filteredBadges,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  // Update a badge's properties.
  //
  // IMPORTANT - BADGE SNAPSHOTS:
  // This only updates the Badge document itself.
  // User.badges[] snapshots are NEVER modified - they preserve how the badge
  // looked when earned. For example, changing awardedHow affects how FUTURE
  // badges are awarded, but existing user snapshots retain their original awardedHow.
  updateBadge: async (
    args: { updateBadgeInput: badgeType },
    req: AuthRequest,
  ): Promise<badgeType> => {
    if (!req.isAuth) {
      throwError("updateBadge", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const { _id, url, name, customName, rarity, awardedHow, awardedDesc, zoom } = args.updateBadgeInput
      const user = (await User.findById(req._id)) as userTypeMongo

      // Check for errors.
      userErrors(user)
      badgeURLErrors(url)
      badgeNameErrors(name)
      badgeCustomNameErrors(customName)
      badgeAwardedHowErrors(awardedHow)
      badgeAwardedDescErrors(awardedHow, awardedDesc)
      badgeRarityErrors(rarity)
      badgeZoomErrors(zoom)
      await badgeDuplicateErrors(args.updateBadgeInput)

      // Find a badge by _id.
      const badge = await Badge.findById(_id)

      if (!badge) {
        throwError("updateBadge", badge, "No badge by that _id was found!")
        return args.updateBadgeInput
      }

      // Prevent updating default badges - they are system-managed.
      if (badge.isDefault) {
        return throwError("updateBadge", badge._id, "Cannot modify default badges!", 403)
      }

      // Check authorization for championship badges.
      if (badge.championship) {
        const champ = await Champ.findById(badge.championship)
        if (champ) {
          const isAdmin = user?.permissions?.admin === true
          const isAdjudicator = champ.adjudicator.current.toString() === req._id?.toString()

          // Only adjudicator or admin can edit badges.
          if (!isAdmin && !isAdjudicator) {
            return throwError("updateBadge", req._id, "Only adjudicator or admin can edit badges!", 403)
          }

          // Check if adjudicator is trying to edit a hidden badge when not allowed.
          const adjCanSeeBadges = champ.settings?.admin?.adjCanSeeBadges ?? true
          const hasBeenEarned = champ.discoveredBadges?.some(
            (d) => d.badge.toString() === badge._id.toString()
          ) || false

          if (!hasBeenEarned && isAdjudicator && !isAdmin && !adjCanSeeBadges) {
            return throwError("updateBadge", badge._id, "Cannot edit hidden badges!", 403)
          }
        }
      }

      // Mutate badge.
      badge.url = url
      badge.name = name
      badge.customName = customName || undefined
      badge.rarity = rarity
      badge.awardedHow = awardedHow
      badge.awardedDesc = findDesc(badgeRewardOutcomes, awardedHow)
      badge.zoom = zoom
      badge.updated_at = moment().format()

      // Save changes.
      await badge.save()

      // Return the new user with tokens.
      return {
        ...badge._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  // Delete a badge and its S3 image.
  //
  // IMPORTANT - BADGE SNAPSHOTS:
  // This deletes the Badge document and removes the ref from champ.champBadges.
  // However, User.badges[] snapshots are NEVER deleted - they are permanent records.
  // Users who earned this badge will still see it on their profile forever.
  // This is intentional: snapshots preserve the badge as it was when earned.
  deleteBadge: async (
    { _id }: { _id: ObjectId },
    req: AuthRequest,
  ): Promise<badgeType> => {
    if (!req.isAuth) {
      throwError("deleteBadge", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo

      // Check for errors.
      userErrors(user)

      // Find badge by _id.
      const badge = await Badge.findById(_id)

      if (!badge) {
        throwError("deleteBadge", badge, "No badge by that _id was found!")
        return { _id } as badgeType
      }

      // Prevent deleting default badges - they are system-managed.
      if (badge.isDefault) {
        return throwError("deleteBadge", badge._id, "Cannot delete default badges!", 403)
      }

      // Check authorization for championship badges.
      // For default badges (no championship), we need to find which champs use this badge.
      let authChamp = null
      if (badge.championship) {
        authChamp = await Champ.findById(badge.championship)
        if (authChamp) {
          const isAdmin = user?.permissions?.admin === true
          const isAdjudicator = authChamp.adjudicator.current.toString() === req._id?.toString()

          // Only adjudicator or admin can delete badges.
          if (!isAdmin && !isAdjudicator) {
            return throwError("deleteBadge", req._id, "Only adjudicator or admin can delete badges!", 403)
          }

          // Check if adjudicator is trying to delete a hidden badge when not allowed.
          const adjCanSeeBadges = authChamp.settings?.admin?.adjCanSeeBadges ?? true
          const hasBeenEarned = authChamp.discoveredBadges?.some(
            (d) => d.badge.toString() === badge._id.toString()
          ) || false

          if (!hasBeenEarned && isAdjudicator && !isAdmin && !adjCanSeeBadges) {
            return throwError("deleteBadge", badge._id, "Cannot delete hidden badges!", 403)
          }
        }
      }

      // Delete the S3 image.
      const deleteErr = await deleteS3(clientS3(), clientS3(badge.url).params, 0)
      if (deleteErr) {
        throwError("deleteBadge", deleteErr, deleteErr)
      }

      // Remove badge from all championships that reference it (handles both custom and default badges).
      // Also remove from discoveredBadges array.
      const champsWithBadge = await Champ.find({ champBadges: badge._id })
      for (const champ of champsWithBadge) {
        // Remove from champBadges array and discoveredBadges array.
        await Champ.findByIdAndUpdate(champ._id, {
          $pull: {
            champBadges: badge._id,
            discoveredBadges: { badge: badge._id },
          },
        })

        // Calculate new badge counts from updated championship.
        const updatedChamp = await Champ.findById(champ._id)
        const totalBadges = updatedChamp?.champBadges?.length || 0
        const discoveredBadges = updatedChamp?.discoveredBadges?.length || 0

        await User.updateMany(
          { "championships._id": champ._id },
          {
            $set: {
              "championships.$.totalBadges": totalBadges,
              "championships.$.discoveredBadges": discoveredBadges,
              "championships.$.updated_at": moment().format(),
            },
          }
        )
      }

      // Delete badge from database.
      await Badge.findByIdAndDelete(_id)

      // Return the deleted badge with tokens.
      return {
        ...badge._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  // Award a badge to a user.
  // This is used for ACTION-BASED badges that cannot be detected in resultsHandler.
  // Examples: Joined Championship, Became Adjudicator, Banned Competitor, etc.
  //
  // NO AUTH CHECK: The calling action handles its own authorization.
  // (e.g., banCompetitor already requires adjudicator auth before calling this)
  awardBadge: async (
    { userId, champId, awardedHow }: { userId: string; champId: string; awardedHow: string },
    req: AuthRequest,
  ): Promise<{ success: boolean; message?: string; badge?: userBadgeSnapshotType; tokens: string[] }> => {
    try {
      // Find the championship.
      const champ = await Champ.findById(champId).populate("champBadges")
      if (!champ) {
        return { success: false, message: "Championship not found", tokens: req.tokens }
      }

      // Find the badge by awardedHow in champBadges.
      const badgeDoc = (champ.champBadges as unknown as badgeType[])?.find(
        (b) => b.awardedHow === awardedHow
      )
      if (!badgeDoc) {
        return { success: false, message: `No badge found with awardedHow: "${awardedHow}"`, tokens: req.tokens }
      }

      // Find the user.
      const user = await User.findById(userId)
      if (!user) {
        return { success: false, message: "User not found", tokens: req.tokens }
      }

      // Check if user already has this badge for this championship (prevent duplicates).
      const alreadyHasBadge = user.badges?.some(
        (b) =>
          b.awardedHow === awardedHow &&
          b.championship?.toString() === champId.toString()
      )
      if (alreadyHasBadge) {
        return { success: false, message: "User already has this badge", tokens: req.tokens }
      }

      // Create badge snapshot.
      const awarded_at = moment().format()
      const snapshot: userBadgeSnapshotType = {
        _id: badgeDoc._id,
        url: badgeDoc.url,
        name: badgeDoc.name,
        customName: badgeDoc.customName,
        rarity: badgeDoc.rarity,
        awardedHow: badgeDoc.awardedHow,
        awardedDesc: badgeDoc.awardedDesc,
        zoom: badgeDoc.zoom || 100,
        championship: new ObjectId(champId),
        awarded_at,
        featured: null,
      }

      // Add badge snapshot to user's badges array.
      await User.findByIdAndUpdate(userId, {
        $addToSet: { badges: snapshot },
      })

      // Update Champ.discoveredBadges if this is the first discovery of this badge.
      const isFirstDiscovery = !champ.discoveredBadges?.some(
        (d) => d.badge.toString() === badgeDoc._id.toString()
      )
      if (isFirstDiscovery) {
        await Champ.findByIdAndUpdate(champId, {
          $push: {
            discoveredBadges: {
              badge: badgeDoc._id,
              discoveredBy: new ObjectId(userId),
              discoveredAt: awarded_at,
            },
          },
          $set: { updated_at: awarded_at },
        })
      }

      // Send notification via socket.io + email.
      await sendNotification({
        userId: new ObjectId(userId),
        type: "badge_earned",
        title: "Badge Earned!",
        description: `You earned the "${badgeDoc.customName || badgeDoc.name}" badge`,
        champId: champ._id,
        champName: champ.name,
        champIcon: champ.icon,
        badgeSnapshot: snapshot,
      })

      log.info(`Awarded "${awardedHow}" to user ${userId} in championship ${champId}`)

      return { success: true, badge: snapshot, tokens: req.tokens }
    } catch (err) {
      log.error("Error:", err)
      throw err
    }
  },
  // Removes a badge from a championship's champBadges array.
  // This does NOT delete the badge from the database - it only removes the reference.
  // Used for removing default badges from a championship.
  removeChampBadge: async (
    { champId, badgeId }: { champId: string; badgeId: string },
    req: AuthRequest,
  ): Promise<{ success: boolean; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("removeChampBadge", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      const champ = await Champ.findById(champId)
      if (!champ) {
        return throwError("removeChampBadge", champId, "Championship not found!", 404)
      }

      // Authorization: only adjudicator or admin can remove badges.
      const isAdmin = user?.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id?.toString()
      if (!isAdmin && !isAdjudicator) {
        return throwError("removeChampBadge", req._id, "Only adjudicator or admin can remove badges!", 403)
      }

      // Remove badge from champBadges array.
      await Champ.findByIdAndUpdate(champId, {
        $pull: { champBadges: new ObjectId(badgeId) },
      })

      // Update user championship snapshots with new badge count.
      const updatedChamp = await Champ.findById(champId)
      const totalBadges = updatedChamp?.champBadges?.length || 0

      await User.updateMany(
        { "championships._id": champId },
        {
          $set: {
            "championships.$.totalBadges": totalBadges,
            "championships.$.updated_at": moment().format(),
          },
        },
      )

      return { success: true, tokens: req.tokens }
    } catch (err) {
      throw err
    }
  },
}

export default badgeResolvers
