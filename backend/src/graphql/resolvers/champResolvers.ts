import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Champ, { ChampType, CompetitorEntry, Round, SeasonHistory } from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
import Series from "../../models/series"
import Badge from "../../models/badge"
import Protest from "../../models/protest"
import { ObjectId } from "mongodb"
import { champNameErrors, falsyValErrors, throwError, userErrors } from "./resolverErrors"
import { clientS3, deleteS3 } from "../../shared/utility"
import { champPopulation } from "../../shared/population"

// Input types for the createChamp mutation.
interface PointsStructureInput {
  position: number
  points: number
}

interface RuleSubsectionInput {
  text: string
}

interface RuleInput {
  default?: boolean
  text: string
  subsections?: RuleSubsectionInput[]
}

export interface ChampInput {
  name: string
  icon?: string
  profile_picture?: string
  series: string
  rounds: number
  pointsStructure: PointsStructureInput[]
  inviteOnly?: boolean
  maxCompetitors?: number
  rulesAndRegs?: RuleInput[]
  champBadges?: string[]
}

// Generates an initial competitor entry for a user.
const createCompetitorEntry = (
  userId: ObjectId,
  totalPoints = 0,
  position = 1,
): CompetitorEntry => ({
  competitor: userId,
  bet: null,
  points: 0,
  totalPoints,
  position,
  updated_at: null,
  created_at: null,
})

// Generates an empty round with the given round number.
const createEmptyRound = (roundNumber: number, competitors: CompetitorEntry[] = []): Round => ({
  round: roundNumber,
  status: "waiting",
  competitors,
  drivers: [],
  teams: [],
  winner: null,
  runnerUp: null,
})

const champResolvers = {
  // Fetches a championship by ID with all populated references.
  getChampById: async ({ _id }: { _id: string }, req: AuthRequest): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("getChampById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id).populate(champPopulation).exec()

      if (!champ) {
        return throwError("getChampById", _id, "Championship not found!", 404)
      }

      return {
        ...champ._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Returns all championships.
  getChamps: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<{ array: ChampType[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getChamps", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champs = await Champ.find({})
        .populate("adjudicator.current", "_id name icon")
        .populate("series", "_id name")
        .populate("rounds.competitors.competitor", "_id icon")
        .exec()

      return {
        array: champs,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Creates a new championship.
  createChamp: async (args: { champInput: ChampInput }, req: AuthRequest): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("createChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const {
        name,
        icon,
        profile_picture,
        series,
        rounds,
        pointsStructure,
        inviteOnly,
        maxCompetitors,
        rulesAndRegs,
        champBadges,
      } = args.champInput

      // Validate user exists.
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Check for errors.
      await champNameErrors(name)
      falsyValErrors({
        champName: name,
        series,
      })

      // Validate series exists.
      const seriesDoc = await Series.findById(series)
      if (!seriesDoc) {
        return throwError("series", series, "Series not found.")
      }

      // Validate points structure.
      if (!pointsStructure || pointsStructure.length === 0) {
        throwError("pointsStructure", pointsStructure, "Points structure is required.")
      }

      // Process rules and regs with user references and timestamps.
      const processedRulesAndRegs =
        rulesAndRegs?.map((rule) => ({
          default: rule.default ?? false,
          text: rule.text,
          created_by: user._id,
          pendingChanges: [],
          history: [],
          subsections:
            rule.subsections?.map((sub) => ({
              text: sub.text,
              pendingChanges: [],
              history: [],
              created_by: user._id,
              created_at: moment().format(),
            })) || [],
          created_at: moment().format(),
        })) || []

      // Validate rounds count.
      const roundCount = rounds || 1
      if (roundCount < 1) {
        throwError("rounds", rounds, "Rounds must be at least 1.")
      }

      // Generate N rounds - first round has the creator as competitor, rest are empty.
      const generatedRounds: Round[] = []
      for (let i = 1; i <= roundCount; i++) {
        if (i === 1) {
          // First round has the creator as the only competitor.
          generatedRounds.push(createEmptyRound(i, [createCompetitorEntry(user._id, 0, 1)]))
        } else {
          // Subsequent rounds start with empty competitors (will be copied when round progresses).
          generatedRounds.push(createEmptyRound(i))
        }
      }

      // Build the initial adjudicator object.
      const initialAdjudicator = {
        current: user._id,
        fromDateTime: moment().format(),
        history: [],
      }

      // Build the initial season history entry.
      const initialSeasonHistory: SeasonHistory = {
        season: 1,
        adjudicator: initialAdjudicator,
        drivers: seriesDoc.drivers, // Drivers from the selected series.
        rounds: generatedRounds,
        pointsStructure,
      }

      // Create the championship document.
      const champ = new Champ({
        name,
        icon: icon || "",
        profile_picture: profile_picture || "",
        season: 1,
        active: true,
        rounds: generatedRounds,
        series: new ObjectId(series),
        pointsStructure,
        adjudicator: initialAdjudicator,
        rulesAndRegs: processedRulesAndRegs,
        settings: {
          inviteOnly: inviteOnly || false,
          maxCompetitors: maxCompetitors || 24,
        },
        champBadges: [],
        waitingList: [],
        history: [initialSeasonHistory],
        created_by: user._id,
        created_at: moment().format(),
        updated_at: moment().format(),
      })

      // Save the championship.
      const newChamp = await champ.save()

      // Process badges if provided.
      const badgeIds: ObjectId[] = []
      if (champBadges && champBadges.length > 0) {
        for (const badgeId of champBadges) {
          const badge = await Badge.findById(badgeId)
          if (badge) {
            badgeIds.push(badge._id)
          }
        }
      }

      // Update championship with badge references.
      if (badgeIds.length > 0) {
        newChamp.champBadges = badgeIds
        await newChamp.save()
      }

      // Update series with championship reference.
      seriesDoc.championships.push(newChamp._id)
      await seriesDoc.save()

      // Update user with championship reference.
      user.championships.push(newChamp._id)
      await user.save()

      // Return the created championship with tokens.
      return {
        ...newChamp._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Allows a user to join a championship.
  joinChamp: async ({ _id }: { _id: string }, req: AuthRequest): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("joinChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("joinChamp", _id, "Championship not found!", 404)
      }

      // Validate user exists.
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Get the current active round (first round that isn't completed).
      const currentRound = champ.rounds.find((r) => r.status !== "completed") || champ.rounds[0]
      if (!currentRound) {
        return throwError("joinChamp", _id, "No rounds available in this championship!", 400)
      }

      // Check if user is already a competitor in the current round.
      const isAlreadyCompetitor = currentRound.competitors.some(
        (c) => c.competitor.toString() === req._id,
      )
      if (isAlreadyCompetitor) {
        return throwError(
          "joinChamp",
          req._id,
          "You are already a competitor in this championship!",
          400,
        )
      }

      // Check if championship is invite only.
      if (champ.settings.inviteOnly) {
        return throwError("joinChamp", req._id, "This championship is invite only!", 403)
      }

      // Check if championship is full (based on current round competitors).
      if (currentRound.competitors.length >= champ.settings.maxCompetitors) {
        return throwError("joinChamp", req._id, "This championship is full!", 400)
      }

      // Calculate position for the new competitor (last place).
      const newPosition = currentRound.competitors.length + 1

      // Add user to the current round's competitors.
      currentRound.competitors.push(createCompetitorEntry(user._id, 0, newPosition))

      champ.updated_at = moment().format()
      await champ.save()

      // Add championship to user's championships.
      user.championships.push(champ._id)
      await user.save()

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("joinChamp", _id, "Championship not found after update!", 404)
      }

      return {
        ...populatedChamp._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Updates championship profile picture (adjudicator only).
  updateChampPP: async (
    { _id, icon, profile_picture }: { _id: string; icon: string; profile_picture: string },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("updateChampPP", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("updateChampPP", _id, "Championship not found!", 404)
      }

      // Verify user is the adjudicator.
      if (champ.adjudicator.current.toString() !== req._id) {
        return throwError(
          "updateChampPP",
          req._id,
          "Only the adjudicator can update championship images!",
          403,
        )
      }

      // Update icon and profile_picture.
      champ.icon = icon
      champ.profile_picture = profile_picture
      champ.updated_at = moment().format()

      await champ.save()

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("updateChampPP", _id, "Championship not found after update!", 404)
      }

      return {
        ...populatedChamp._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Updates championship settings (adjudicator only).
  updateChampSettings: async (
    { _id, name, inviteOnly }: { _id: string; name?: string; inviteOnly?: boolean },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("updateChampSettings", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("updateChampSettings", _id, "Championship not found!", 404)
      }

      // Verify user is the adjudicator.
      if (champ.adjudicator.current.toString() !== req._id) {
        return throwError(
          "updateChampSettings",
          req._id,
          "Only the adjudicator can update championship settings!",
          403,
        )
      }

      // Update name if provided and different.
      if (name && name !== champ.name) {
        await champNameErrors(name)
        champ.name = name
      }

      // Update inviteOnly if provided.
      if (typeof inviteOnly === "boolean") {
        champ.settings.inviteOnly = inviteOnly
      }

      champ.updated_at = moment().format()
      await champ.save()

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("updateChampSettings", _id, "Championship not found after update!", 404)
      }

      return {
        ...populatedChamp._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Deletes a championship and cleans up all related data.
  deleteChamp: async (
    { _id, confirmName }: { _id: string; confirmName: string },
    req: AuthRequest,
  ): Promise<{ _id: string; name: string; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("deleteChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Fetch championship.
      const champ = await Champ.findById(_id)
      if (!champ) {
        return throwError("deleteChamp", _id, "Championship not found!", 404)
      }

      // Fetch user to check permissions.
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Check permissions: admin can delete any champ, otherwise must be adjudicator.
      const isAdmin = user.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id

      if (!isAdmin && !isAdjudicator) {
        return throwError(
          "deleteChamp",
          req._id,
          "Only the adjudicator or an admin can delete this championship!",
          403,
        )
      }

      // Validate confirmName matches champ.name (case-sensitive).
      if (confirmName !== champ.name) {
        return throwError(
          "deleteChamp",
          confirmName,
          "Championship name does not match. Deletion cancelled.",
          400,
        )
      }

      const champName = champ.name
      const champId = champ._id

      // Delete S3 images (icon and profile_picture).
      if (champ.icon) {
        const iconErr = await deleteS3(clientS3(), clientS3(champ.icon).params, 0)
        if (iconErr) {
          throwError("deleteChamp", champ.icon, iconErr)
        }
      }
      if (champ.profile_picture) {
        const ppErr = await deleteS3(clientS3(), clientS3(champ.profile_picture).params, 0)
        if (ppErr) {
          throwError("deleteChamp", champ.profile_picture, ppErr)
        }
      }

      // Delete all Protests for this championship.
      await Protest.deleteMany({ championship: champId })

      // Remove championship from Series.championships array.
      await Series.updateOne({ _id: champ.series }, { $pull: { championships: champId } })

      // Remove championship from all Users.championships arrays.
      await User.updateMany({ championships: champId }, { $pull: { championships: champId } })

      // Update all Badges: set championship to null (keep badge for users who earned it).
      await Badge.updateMany({ championship: champId }, { $set: { championship: null } })

      // Delete the championship document.
      await Champ.findByIdAndDelete(champId)

      return {
        _id: champId.toString(),
        name: champName,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default champResolvers
