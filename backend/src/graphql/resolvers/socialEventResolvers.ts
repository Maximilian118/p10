import User, { userType, userTypeMongo } from "../../models/user"
import SocialEvent, { SocialEventType, SocialEventSettingsType } from "../../models/socialEvent"
import SocialComment, { SocialCommentType } from "../../models/socialComment"
import { throwError } from "./resolverErrors"
import { AuthRequest } from "../../middleware/auth"
import { signTokens } from "../../shared/utility"

// Compute unread notifications count from a user's notifications array.
const getUnreadCount = (user: userTypeMongo): number => {
  return (user.notifications || []).filter(
    (n: { read: boolean }) => !n.read,
  ).length
}

const socialEventResolvers = {
  // Fetch paginated social feed for the authenticated user.
  // Uses cursor-based pagination with created_at as the cursor.
  // Feed priority: followed users > geo-close users > global recent.
  getFeed: async (
    { cursor, limit = 20 }: { cursor?: string; limit?: number },
    req: AuthRequest,
  ): Promise<{ events: SocialEventType[]; nextCursor: string | null; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getFeed", req.isAuth, "Not Authenticated!", 401)
    }

    const user = await User.findById(req._id).select("following location refresh_count") as userTypeMongo
    if (!user) {
      throwError("getFeed", null, "User not found!", 404)
    }

    const following = user.following || []
    const fetchLimit = Math.min(limit, 50)

    // Build the query filter based on follow/geo/global priority.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {}
    let isFiltered = false

    if (following.length > 0) {
      // Primary: events from followed users.
      filter.user = { $in: following }
      isFiltered = true
    } else if (user.location?.country) {
      // Secondary: events from users in the same country.
      const nearbyUsers = await User.find({
        "location.country": user.location.country,
        _id: { $ne: req._id },
      }).select("_id").limit(200)
      filter.user = { $in: nearbyUsers.map(u => u._id) }
      isFiltered = true
    }
    // If no follows and no geo, filter stays empty = global recent events.

    if (cursor) {
      filter.created_at = { $lt: cursor }
    }

    // Fetch one extra to detect if more pages exist.
    const events = await SocialEvent.find(filter)
      .sort({ created_at: -1 })
      .limit(fetchLimit + 1)
      .lean()

    // Backfill with global events if the filtered query returned fewer than a full page.
    if (isFiltered && events.length <= fetchLimit) {
      const excludeIds = events.map(e => e._id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backfillFilter: any = { _id: { $nin: excludeIds } }
      if (cursor) backfillFilter.created_at = { $lt: cursor }

      const backfill = await SocialEvent.find(backfillFilter)
        .sort({ created_at: -1 })
        .limit(fetchLimit + 1 - events.length)
        .lean()

      events.push(...backfill)
    }

    const hasMore = events.length > fetchLimit
    if (hasMore) events.pop()

    const nextCursor = hasMore && events.length > 0
      ? events[events.length - 1].created_at
      : null

    return {
      events,
      nextCursor,
      tokens: signTokens(user),
    }
  },

  // Fetch paginated comments for a social event.
  // Sorts by blended score: likes + follow boost, then recency.
  getComments: async (
    { eventId, cursor, limit = 20 }: { eventId: string; cursor?: string; limit?: number },
    req: AuthRequest,
  ): Promise<{ comments: (SocialCommentType & { likesCount: number; dislikesCount: number })[]; nextCursor: string | null; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getComments", req.isAuth, "Not Authenticated!", 401)
    }

    const user = await User.findById(req._id).select("following refresh_count") as userTypeMongo
    if (!user) {
      throwError("getComments", null, "User not found!", 404)
    }

    const fetchLimit = Math.min(limit, 50)

    // Build query for comments on this event.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { event: eventId }
    if (cursor) {
      filter.created_at = { $lt: cursor }
    }

    const comments = await SocialComment.find(filter)
      .sort({ created_at: -1 })
      .limit(fetchLimit + 1)
      .lean()

    const hasMore = comments.length > fetchLimit
    if (hasMore) comments.pop()

    const nextCursor = hasMore && comments.length > 0
      ? comments[comments.length - 1].created_at
      : null

    // Sort by blended score: likes + follow boost, then recency as tiebreaker.
    const FOLLOW_BOOST = 3
    const followingSet = new Set((user.following || []).map(id => id.toString()))
    const sorted = [...comments].sort((a, b) => {
      const aLikes = (a.likes || []).length
      const bLikes = (b.likes || []).length
      const aScore = aLikes + (followingSet.has(a.user.toString()) ? FOLLOW_BOOST : 0)
      const bScore = bLikes + (followingSet.has(b.user.toString()) ? FOLLOW_BOOST : 0)
      if (aScore !== bScore) return bScore - aScore
      return b.created_at.localeCompare(a.created_at)
    })

    // Add computed counts.
    const commentsWithCounts = sorted.map(c => ({
      ...c,
      likesCount: (c.likes || []).length,
      dislikesCount: (c.dislikes || []).length,
    }))

    return {
      comments: commentsWithCounts,
      nextCursor,
      tokens: signTokens(user),
    }
  },

  // Fetch the most-liked comment for a social event.
  getTopComment: async (
    { eventId }: { eventId: string },
    req: AuthRequest,
  ): Promise<{ comment: (SocialCommentType & { likesCount: number; dislikesCount: number }) | null; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getTopComment", req.isAuth, "Not Authenticated!", 401)
    }

    const user = await User.findById(req._id).select("refresh_count") as userTypeMongo
    if (!user) {
      throwError("getTopComment", null, "User not found!", 404)
    }

    // Find the comment with the most likes, breaking ties by newest.
    const comments = await SocialComment.find({ event: eventId }).lean()

    if (comments.length === 0) {
      return { comment: null, tokens: signTokens(user) }
    }

    // Sort by likes count descending, then by recency.
    const sorted = comments.sort((a, b) => {
      const aLikes = (a.likes || []).length
      const bLikes = (b.likes || []).length
      if (aLikes !== bLikes) return bLikes - aLikes
      return b.created_at.localeCompare(a.created_at)
    })

    const top = sorted[0]

    return {
      comment: {
        ...top,
        likesCount: (top.likes || []).length,
        dislikesCount: (top.dislikes || []).length,
      },
      tokens: signTokens(user),
    }
  },

  // Fetch a user's following list as basic user objects.
  // If userId is provided, fetch that user's following. Otherwise fetch the authenticated user's.
  getFollowing: async (
    { userId }: { userId?: string },
    req: AuthRequest,
  ): Promise<{ array: userType[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getFollowing", req.isAuth, "Not Authenticated!", 401)
    }

    const authUser = await User.findById(req._id).select("following refresh_count") as userTypeMongo
    if (!authUser) {
      throwError("getFollowing", null, "User not found!", 404)
    }

    // Determine whose following list to fetch.
    let followingIds = authUser.following || []
    if (userId && userId !== req._id) {
      const targetUser = await User.findById(userId).select("following")
      followingIds = targetUser?.following || []
    }

    const followedUsers = await User.find({
      _id: { $in: followingIds },
    }).select("_id name icon")

    return {
      array: followedUsers,
      tokens: signTokens(authUser),
    }
  },

  // Fetch a user's following list with championship and location data for the detail view.
  getFollowingDetailed: async (
    { userId }: { userId: string },
    req: AuthRequest,
  ): Promise<{ users: unknown[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getFollowingDetailed", req.isAuth, "Not Authenticated!", 401)
    }

    const authUser = await User.findById(req._id).select("refresh_count") as userTypeMongo
    if (!authUser) {
      throwError("getFollowingDetailed", null, "User not found!", 404)
    }

    // Fetch the target user's following list.
    const targetUser = await User.findById(userId).select("following")
    const followingIds = targetUser?.following || []

    // Fetch followed users with championship snapshots and location.
    const followedUsers = await User.find({
      _id: { $in: followingIds },
    }).select("_id name icon championships location")

    // Map to lean response with minimal championship data.
    const users = followedUsers.map(u => ({
      _id: u._id,
      name: u.name,
      icon: u.icon,
      championships: (u.championships || []).map((c: { _id: unknown; name: string; icon: string; updated_at?: string }) => ({
        _id: c._id,
        name: c.name,
        icon: c.icon,
        updated_at: c.updated_at,
      })),
      location: u.location || null,
    }))

    return {
      users,
      tokens: signTokens(authUser),
    }
  },

  // Follow a user. Adds target userId to the authenticated user's following array.
  followUser: async (
    { userId }: { userId: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("followUser", req.isAuth, "Not Authenticated!", 401)
    }

    // Prevent following yourself.
    if (userId === req._id) {
      throwError("followUser", null, "You cannot follow yourself!", 400)
    }

    // Verify target user exists.
    const targetUser = await User.findById(userId).select("_id")
    if (!targetUser) {
      throwError("followUser", null, "User not found!", 404)
    }

    // Atomic $addToSet prevents duplicates.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $addToSet: { following: userId } },
      { new: true },
    ) as userTypeMongo

    if (!user) {
      throwError("followUser", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Unfollow a user. Removes target userId from the authenticated user's following array.
  unfollowUser: async (
    { userId }: { userId: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("unfollowUser", req.isAuth, "Not Authenticated!", 401)
    }

    // Atomic $pull removes the userId.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $pull: { following: userId } },
      { new: true },
    ) as userTypeMongo

    if (!user) {
      throwError("unfollowUser", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Add a comment to a social event.
  addComment: async (
    { eventId, text }: { eventId: string; text: string },
    req: AuthRequest,
  ): Promise<SocialCommentType & { likesCount: number; dislikesCount: number; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("addComment", req.isAuth, "Not Authenticated!", 401)
    }

    if (!text || text.trim().length === 0) {
      throwError("addComment", null, "Comment text is required!", 400)
    }

    if (text.length > 500) {
      throwError("addComment", null, "Comment must be 500 characters or less!", 400)
    }

    const user = await User.findById(req._id).select("name icon refresh_count") as userTypeMongo
    if (!user) {
      throwError("addComment", null, "User not found!", 404)
    }

    // Verify the social event exists.
    const event = await SocialEvent.findById(eventId)
    if (!event) {
      throwError("addComment", null, "Social event not found!", 404)
    }

    // Create the comment.
    const comment = new SocialComment({
      event: eventId,
      user: req._id,
      userSnapshot: { name: user.name, icon: user.icon },
      text: text.trim(),
      likes: [],
      dislikes: [],
    })
    await comment.save()

    // Increment the denormalized comment count on the event.
    await SocialEvent.findByIdAndUpdate(eventId, { $inc: { commentCount: 1 } })

    return {
      ...comment.toObject(),
      likesCount: 0,
      dislikesCount: 0,
      tokens: signTokens(user),
    }
  },

  // Toggle like on a comment. Adds like if not present, removes if already liked.
  // Removes dislike if switching from dislike to like.
  toggleCommentLike: async (
    { commentId }: { commentId: string },
    req: AuthRequest,
  ): Promise<SocialCommentType & { likesCount: number; dislikesCount: number; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("toggleCommentLike", req.isAuth, "Not Authenticated!", 401)
    }

    const user = await User.findById(req._id).select("refresh_count") as userTypeMongo
    if (!user) {
      throwError("toggleCommentLike", null, "User not found!", 404)
    }

    const comment = await SocialComment.findById(commentId)
    if (!comment) {
      throwError("toggleCommentLike", null, "Comment not found!", 404)
      return null as never
    }

    const userId = req._id!
    const alreadyLiked = comment.likes.some(id => id.toString() === userId)

    if (alreadyLiked) {
      // Remove like.
      await SocialComment.findByIdAndUpdate(commentId, { $pull: { likes: userId } })
    } else {
      // Add like and remove dislike if present.
      await SocialComment.findByIdAndUpdate(commentId, {
        $addToSet: { likes: userId },
        $pull: { dislikes: userId },
      })
    }

    const updated = await SocialComment.findById(commentId).lean()

    return {
      ...updated!,
      likesCount: (updated!.likes || []).length,
      dislikesCount: (updated!.dislikes || []).length,
      tokens: signTokens(user),
    }
  },

  // Toggle dislike on a comment. Adds dislike if not present, removes if already disliked.
  // Removes like if switching from like to dislike.
  toggleCommentDislike: async (
    { commentId }: { commentId: string },
    req: AuthRequest,
  ): Promise<SocialCommentType & { likesCount: number; dislikesCount: number; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("toggleCommentDislike", req.isAuth, "Not Authenticated!", 401)
    }

    const user = await User.findById(req._id).select("refresh_count") as userTypeMongo
    if (!user) {
      throwError("toggleCommentDislike", null, "User not found!", 404)
    }

    const comment = await SocialComment.findById(commentId)
    if (!comment) {
      throwError("toggleCommentDislike", null, "Comment not found!", 404)
      return null as never
    }

    const userId = req._id!
    const alreadyDisliked = comment.dislikes.some(id => id.toString() === userId)

    if (alreadyDisliked) {
      // Remove dislike.
      await SocialComment.findByIdAndUpdate(commentId, { $pull: { dislikes: userId } })
    } else {
      // Add dislike and remove like if present.
      await SocialComment.findByIdAndUpdate(commentId, {
        $addToSet: { dislikes: userId },
        $pull: { likes: userId },
      })
    }

    const updated = await SocialComment.findById(commentId).lean()

    return {
      ...updated!,
      likesCount: (updated!.likes || []).length,
      dislikesCount: (updated!.dislikes || []).length,
      tokens: signTokens(user),
    }
  },

  // Update social event settings (privacy toggles).
  updateSocialEventSettings: async (
    { settings }: { settings: Partial<SocialEventSettingsType> },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updateSocialEventSettings", req.isAuth, "Not Authenticated!", 401)
    }

    // Build atomic $set operations for only the provided settings.
    const setOperations: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        setOperations[`socialEventSettings.${key}`] = value
      }
    }

    // If no settings provided, just return current user.
    if (Object.keys(setOperations).length === 0) {
      const user = await User.findById(req._id) as userTypeMongo
      if (!user) {
        throwError("updateSocialEventSettings", null, "User not found!", 404)
      }
      return {
        ...user._doc,
        notificationsCount: getUnreadCount(user),
        tokens: signTokens(user),
        password: null,
        email: user.email,
      }
    }

    // Atomic update - set only the provided social event settings.
    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $set: setOperations },
      { new: true },
    ) as userTypeMongo

    if (!user) {
      throwError("updateSocialEventSettings", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },

  // Update user's location for geo-based feed ranking.
  updateLocation: async (
    { location }: { location: { city?: string; region?: string; country?: string; lat?: number; lng?: number } },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updateLocation", req.isAuth, "Not Authenticated!", 401)
    }

    // Build the location object for the update.
    const locationUpdate: Record<string, unknown> = {}
    if (location.city !== undefined) locationUpdate["location.city"] = location.city
    if (location.region !== undefined) locationUpdate["location.region"] = location.region
    if (location.country !== undefined) locationUpdate["location.country"] = location.country
    if (location.lat !== undefined && location.lng !== undefined) {
      locationUpdate["location.coordinates.lat"] = location.lat
      locationUpdate["location.coordinates.lng"] = location.lng
    }

    const user = await User.findOneAndUpdate(
      { _id: req._id },
      { $set: locationUpdate },
      { new: true },
    ) as userTypeMongo

    if (!user) {
      throwError("updateLocation", null, "User not found!", 404)
    }

    return {
      ...user._doc,
      notificationsCount: getUnreadCount(user),
      tokens: signTokens(user),
      password: null,
      email: user.email,
    }
  },
}

export default socialEventResolvers
