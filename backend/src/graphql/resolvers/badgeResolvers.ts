import { AuthRequest } from "../../middleware/auth"
import Badge, { badgeType } from "../../models/badge"
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

      // Save the new user to the DB.
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
  getBadgesByChamp: async (
    { championship }: { championship: ObjectId | null },
    req: AuthRequest,
  ): Promise<{
    array: badgeType[]
    tokens: string[]
  }> => {
    if (!req.isAuth) {
      throwError("getBadgesByChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo

      // Check for errors.
      userErrors(user)

      // Find badges - if no championship provided, return default badges
      let badges
      if (championship === null) {
        badges = await Badge.find({ isDefault: true }).exec()
      } else {
        badges = await Badge.find({ championship }).exec()
      }

      // Return the new user with tokens.
      return {
        array: badges,
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
}

export default badgeResolvers
