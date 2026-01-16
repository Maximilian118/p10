import { AuthRequest } from "../../middleware/auth"
import Badge, { badgeResponseType, badgeType } from "../../models/badge"
import Champ from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
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
        await Champ.findByIdAndUpdate(championship, {
          $push: { champBadges: badge._id }
        })
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
      let badges
      let isAdjudicator = false
      let champ = null

      if (championship === null) {
        // Default badges are templates - show full info to everyone.
        badges = await Badge.find({ isDefault: true }).exec()
        isAdjudicator = true
      } else {
        badges = await Badge.find({ championship }).exec()

        // Check if user is the current adjudicator of this championship.
        champ = await Champ.findById(championship)
        if (champ) {
          isAdjudicator = champ.adjudicator.current.toString() === req._id?.toString()
        }
      }

      // Check if adjudicator can see hidden badges (admin setting).
      const adjCanSeeBadges = champ?.settings?.admin?.adjCanSeeBadges ?? true

      // Filter sensitive fields for unearned badges.
      const filteredBadges = badges.map((badge) => {
        const badgeDoc = badge._doc
        const hasBeenEarned = badgeDoc.awardedTo && badgeDoc.awardedTo.length > 0

        // If badge has been earned OR (user is adjudicator AND setting allows), return full badge.
        if (hasBeenEarned || (isAdjudicator && adjCanSeeBadges)) {
          return badgeDoc
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

      // Delete the S3 image.
      const deleteErr = await deleteS3(clientS3(), clientS3(badge.url).params, 0)
      if (deleteErr) {
        throwError("deleteBadge", deleteErr, deleteErr)
      }

      // If badge has a championship, remove badge ID from championship's champBadges array.
      if (badge.championship) {
        await Champ.findByIdAndUpdate(badge.championship, {
          $pull: { champBadges: badge._id }
        })
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
}

export default badgeResolvers
