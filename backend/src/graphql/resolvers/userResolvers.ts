import moment from "moment"
import crypto from "crypto"
import { ObjectId } from "mongodb"
import User, { userInputType, userType, userTypeMongo } from "../../models/user"
import EmailVerification from "../../models/emailVerification"
import Champ from "../../models/champ"
import Badge from "../../models/badge"
import Protest from "../../models/protest"
import Series from "../../models/series"
import { comparePass, hashPass, signTokens } from "../../shared/utility"
import generator from "generate-password"
import { Resend } from "resend"

// Initialize Resend email client (optional - app works without it).
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
} else {
  console.warn("⚠️  RESEND_API_KEY not set - email functionality disabled")
}

// Helper to send emails safely (logs warning if Resend not configured).
const sendEmail = async (options: { to: string; subject: string; text: string }) => {
  if (!resend) {
    console.warn(`📧 Email not sent (Resend not configured): ${options.subject} → ${options.to}`)
    return
  }
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@p10-game.com",
      ...options,
    })
  } catch (err) {
    console.error("📧 Failed to send email:", err)
  }
}

import {
  emailErrors,
  iconErrors,
  nameErrors,
  passConfirmErrors,
  passwordErrors,
  profilePictureErrors,
  throwError,
  userErrors,
} from "./resolverErrors"
import { AuthRequest } from "../../middleware/auth"

const userResolvers = {
  createUser: async (args: { userInput: userInputType }): Promise<userType> => {
    try {
      const { name, email, password, passConfirm, icon, profile_picture } = args.userInput

      // Check for errors.
      await nameErrors(name)
      await emailErrors(email)
      passwordErrors(password, passConfirm)
      passConfirmErrors(passConfirm, password)
      iconErrors(icon, profile_picture)
      profilePictureErrors(profile_picture, icon)

      // Consolidate double whitespaces to single and trim.
      const cleanedName = name.replace(/\s+/g, ' ').trim()

      // Create a new user DB object.
      const user = new User({
        name: cleanedName,
        email,
        icon,
        profile_picture,
        password: await hashPass(password as string),
      })

      // Save the new user to the DB.
      await user.save()

      // Return the new user with tokens.
      return {
        ...user._doc,
        tokens: signTokens(user),
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  login: async ({ email, password }: userInputType): Promise<userType> => {
    try {
      const user = (await User.findOne({ email })) as userTypeMongo
      userErrors(user)

      if (!password) {
        throwError("password", user, "No password entry.")
      } else if (user.password && !(await comparePass(password, user.password))) {
        throwError("password", user, "Incorrect password.")
      }

      user.logged_in_at = moment().format()
      await user.save()

      return {
        ...user._doc,
        tokens: signTokens(user),
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Fetches a user by ID with embedded championship snapshots and badges.
  // Security: Limits exposed data for non-owners (hides email, tokens).
  getUserById: async ({ _id }: { _id: string }, req: AuthRequest): Promise<userType> => {
    if (!req.isAuth) {
      throwError("getUserById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Championships are now embedded snapshots, no populate needed.
      const user = (await User.findById(_id)) as userTypeMongo

      userErrors(user)

      // Check if the requester is viewing their own profile.
      const isOwner = req._id === _id

      return {
        ...user._doc,
        email: isOwner ? user._doc.email : null, // Hide email from non-owners.
        tokens: isOwner ? req.tokens : null, // Only owner receives tokens.
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Fetches all users with minimal data (for invite functionality).
  // Returns only _id, name, icon to minimize data transfer.
  getUsers: async (
    { limit }: { limit?: number },
    req: AuthRequest,
  ): Promise<{ array: userType[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getUsers", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Build query with optional limit.
      let query = User.find({}).select("_id name icon")

      if (limit && limit > 0) {
        query = query.limit(limit)
      }

      const users = await query.exec()

      return {
        array: users.map((u) => ({
          ...u._doc,
          password: null,
        })),
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
  forgot: async ({ email }: { email: string }): Promise<string> => {
    try {
      const user = (await User.findOne({ email })) as userTypeMongo

      if (!user) {
        return "Forgot request submitted."
      }

      const randomPass = generator.generate({
        length: 10,
        numbers: true,
        strict: true,
      })

      user.password = await hashPass(randomPass as string)
      user.updated_at = moment().format()
      await user.save()

      // Send password reset email.
      await sendEmail({
        to: email,
        subject: "P10-Game Password Reset",
        text: `Your password is now: ${randomPass}\n\nIf you did not expect this email contact maxcrosby118@gmail.com immediately!`,
      })

      return "Forgot request submitted."
    } catch (err) {
      throw err
    }
  },
  updatePP: async (
    { icon, profile_picture }: { icon: string; profile_picture: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updatePP", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Validate URLs to prevent SSRF attacks.
      iconErrors(icon, profile_picture, user)
      profilePictureErrors(profile_picture, icon, user)

      user.icon = icon
      user.profile_picture = profile_picture
      user.updated_at = moment().format()

      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Initiates email change by sending a verification email to the new address.
  updateEmail: async ({ email }: { email: string }, req: AuthRequest): Promise<string> => {
    if (!req.isAuth) {
      throwError("updateEmail", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)
      await emailErrors(email, user)

      // Generate secure verification token.
      const token = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Remove any existing pending verification for this user.
      await EmailVerification.findOneAndDelete({ userId: req._id })

      // Create new verification record.
      await new EmailVerification({
        userId: req._id,
        newEmail: email,
        token,
        expiresAt,
      }).save()

      // Send verification email to the new address.
      const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`

      await sendEmail({
        to: email,
        subject: "P10-Game Email Verification",
        text: `Please click the link below to verify your new email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this change, please ignore this email.`,
      })

      return "Verification email sent. Please check your inbox."
    } catch (err) {
      throw err
    }
  },
  // Confirms email change using verification token.
  confirmEmailChange: async ({ token }: { token: string }): Promise<userType> => {
    try {
      // Find valid verification record.
      const verification = await EmailVerification.findOne({
        token,
        expiresAt: { $gt: new Date() },
      })

      if (!verification) {
        return throwError("token", token, "Invalid or expired verification token.")
      }

      // Update user's email.
      const user = (await User.findById(verification.userId)) as userTypeMongo
      userErrors(user)

      user.email = verification.newEmail
      user.updated_at = moment().format()
      await user.save()

      // Remove the used verification record.
      await EmailVerification.deleteOne({ _id: verification._id })

      return {
        ...user._doc,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Updates user profile fields (name, email, icon, profile_picture).
  // Only processes fields that are provided. Returns emailChanged flag if email verification was triggered.
  updateUser: async (
    { input }: { input: { name?: string; email?: string; icon?: string; profile_picture?: string } },
    req: AuthRequest,
  ): Promise<{ user: userType; emailChanged: boolean }> => {
    if (!req.isAuth) {
      throwError("updateUser", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      let emailChanged = false

      // Handle name update if provided and different.
      if (input.name !== undefined && input.name !== user.name) {
        await nameErrors(input.name, user)
        // Consolidate double whitespaces to single and trim.
        user.name = input.name.replace(/\s+/g, ' ').trim()
      }

      // Handle email update if provided and different (triggers verification flow).
      if (input.email !== undefined && input.email !== user.email) {
        await emailErrors(input.email, user)

        // Generate secure verification token.
        const token = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Remove any existing pending verification for this user.
        await EmailVerification.findOneAndDelete({ userId: req._id })

        // Create new verification record.
        await new EmailVerification({
          userId: req._id,
          newEmail: input.email,
          token,
          expiresAt,
        }).save()

        // Send verification email to the new address.
        const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`

        await sendEmail({
          to: input.email,
          subject: "P10-Game Email Verification",
          text: `Please click the link below to verify your new email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this change, please ignore this email.`,
        })

        emailChanged = true
      }

      // Handle icon/profile_picture update if both provided.
      if (input.icon !== undefined && input.profile_picture !== undefined) {
        iconErrors(input.icon, input.profile_picture, user)
        profilePictureErrors(input.profile_picture, input.icon, user)
        user.icon = input.icon
        user.profile_picture = input.profile_picture
      }

      user.updated_at = moment().format()
      await user.save()

      return {
        user: {
          ...user._doc,
          tokens: req.tokens,
          password: null,
        },
        emailChanged,
      }
    } catch (err) {
      throw err
    }
  },
  updatePassword: async (
    {
      currentPass,
      password,
      passConfirm,
    }: {
      currentPass: string
      password: string
      passConfirm: string
    },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updatePassword", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      if (!currentPass) {
        throwError("currentPass", user, "No current password entry.")
      } else if (user.password && !(await comparePass(currentPass, user.password))) {
        throwError("currentPass", user, "Incorrect password.")
      }

      passwordErrors(password, passConfirm)
      passConfirmErrors(passConfirm, password)

      user.password = await hashPass(password as string)
      user.updated_at = moment().format()

      await user.save()

      // Send password change notification.
      await sendEmail({
        to: user.email as string,
        subject: "P10-Game Password Change",
        text: `Your password has been changed.\n\nIf you did not expect this email contact maxcrosby118@gmail.com immediately!`,
      })

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Sets or unsets a badge's featured position (1-6) on the user's profile.
  // position: 1-6 to feature, null/0 to unfeature.
  // If another badge occupies the target position, it is automatically unset.
  setFeaturedBadge: async (
    { badgeId, position }: { badgeId: string; position: number | null },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("setFeaturedBadge", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Find the badge in the user's badges array.
      const badgeIndex = user.badges.findIndex(
        (b) => b._id.toString() === badgeId
      )
      if (badgeIndex === -1) {
        throwError("badgeId", badgeId, "Badge not found in user's collection.")
      }

      // Validate position (must be 1-6 or null/0 to unset).
      const normalizedPosition = position === 0 ? null : position
      if (normalizedPosition !== null && (normalizedPosition < 1 || normalizedPosition > 6)) {
        throwError("position", position, "Position must be between 1 and 6.")
      }

      // If setting a position, clear any other badge that has this position.
      if (normalizedPosition !== null) {
        for (let i = 0; i < user.badges.length; i++) {
          if (user.badges[i].featured === normalizedPosition) {
            user.badges[i].featured = null
          }
        }
      }

      // Set the badge's featured position.
      user.badges[badgeIndex].featured = normalizedPosition
      user.updated_at = moment().format()

      // Mark badges array as modified for Mongoose to detect nested changes.
      user.markModified("badges")
      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  // Checks if the authenticated user is currently the adjudicator of any championship.
  isAdjudicator: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<{ isAdjudicator: boolean }> => {
    if (!req.isAuth) {
      throwError("isAdjudicator", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const userId = new ObjectId(req._id)
      const count = await Champ.countDocuments({ "adjudicator.current": userId })
      return { isAdjudicator: count > 0 }
    } catch (err) {
      throw err
    }
  },
  // Deletes the authenticated user's account and cleans up all related data.
  deleteAccount: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<{ success: boolean }> => {
    if (!req.isAuth) {
      throwError("deleteAccount", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const userId = new ObjectId(req._id)
      const user = await User.findById(userId)

      if (!user) {
        return throwError("deleteAccount", req._id, "User not found!", 404)
      }

      // STEP 1: Block if user is adjudicator of any championship.
      const adjudicatorCount = await Champ.countDocuments({ "adjudicator.current": userId })
      if (adjudicatorCount > 0) {
        return throwError(
          "deleteAccount",
          req._id,
          "You must transfer adjudicator rights before deleting your account.",
          403,
        )
      }

      // STEP 2: Create user snapshot for preservation in round data.
      const userSnapshot = { _id: userId, name: user.name, icon: user.icon }

      // STEP 3: Find all championships user is involved in.
      const championships = await Champ.find({
        $or: [
          { competitors: userId },
          { banned: userId },
          { kicked: userId },
          { waitingList: userId },
        ],
      })

      for (const champ of championships) {
        const isOnlyCompetitor =
          champ.competitors.length === 1 && champ.competitors[0].toString() === req._id

        if (isOnlyCompetitor) {
          // Delete championship entirely (following existing deleteChamp pattern).
          await Protest.deleteMany({ championship: champ._id })
          await Series.updateOne({ _id: champ.series }, { $pull: { championships: champ._id } })
          await User.updateMany(
            { "championships._id": champ._id },
            {
              $set: {
                "championships.$.deleted": true,
                "championships.$.updated_at": moment().format(),
              },
            },
          )
          await Badge.updateMany({ championship: champ._id }, { $set: { championship: null } })
          await Champ.findByIdAndDelete(champ._id)
          continue
        }

        // Remove from array fields.
        champ.competitors = champ.competitors.filter((c) => c.toString() !== req._id)
        champ.banned = champ.banned.filter((b) => b.toString() !== req._id)
        champ.kicked = champ.kicked.filter((k) => k.toString() !== req._id)
        champ.waitingList = champ.waitingList.filter((w) => w.toString() !== req._id)

        // Process current season rounds.
        for (let i = 0; i < champ.rounds.length; i++) {
          const round = champ.rounds[i]
          const entryIndex = round.competitors.findIndex(
            (c) => c.competitor.toString() === req._id,
          )

          if (entryIndex === -1) continue

          const entry = round.competitors[entryIndex]
          const hasPoints = entry.totalPoints > 0 || entry.points > 0

          if (hasPoints) {
            // Keep entry but mark as deleted with snapshot.
            entry.deleted = true
            entry.deletedUserSnapshot = userSnapshot
            champ.markModified(`rounds.${i}.competitors.${entryIndex}`)
          } else {
            // Remove entirely if 0 points.
            round.competitors.splice(entryIndex, 1)
            champ.markModified(`rounds.${i}.competitors`)
          }
        }

        // NOTE: history[] (previous seasons) is NEVER modified.
        // NOTE: winner/runnerUp references preserved for historical accuracy.

        champ.updated_at = moment().format()
        await champ.save()
      }

      // STEP 4: Clean up related data.

      // Delete pending email verifications.
      await EmailVerification.deleteMany({ userId })

      // Note: User.badges[] snapshots are permanent and NOT deleted on account deletion.
      // This preserves the historical record of what badges the user earned.

      // Remove votes from protests (keep protests they created for historical record).
      await Protest.updateMany(
        { "votes.competitor": userId },
        { $pull: { votes: { competitor: userId } } },
      )

      // NOTE: S3 images NOT deleted - URLs are preserved in snapshots.
      // NOTE: rulesAndRegs created_by NOT modified - historical attribution.
      // NOTE: Driver/Team/Series created_by NOT modified - just attribution.

      // STEP 5: Delete user document.
      await User.findByIdAndDelete(userId)

      return { success: true }
    } catch (err) {
      throw err
    }
  },
}

export default userResolvers
