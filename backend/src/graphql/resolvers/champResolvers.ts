import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Champ, { ChampType, CompetitorEntry, Round } from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
import DriverGroup from "../../models/driverGroup"
import Badge from "../../models/badge"
import { ObjectId } from "mongodb"
import { champNameErrors, falsyValErrors, throwError, userErrors } from "./resolverErrors"

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
  driverGroup: string
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

// Population options for championship queries.
const champPopulation = [
  { path: "rounds.competitors.competitor", select: "_id name icon profile_picture permissions created_at" },
  { path: "rounds.competitors.bet" },
  { path: "rounds.winner", select: "_id name icon" },
  { path: "rounds.runnerUp", select: "_id name icon" },
  { path: "adjudicator.current", select: "_id name icon profile_picture permissions created_at" },
  { path: "adjudicator.history.adjudicator", select: "_id name icon" },
  { path: "driverGroup", populate: { path: "drivers" } },
  { path: "champBadges" },
  { path: "waitingList", select: "_id name icon" },
  { path: "created_by", select: "_id name icon" },
  // Rules and regulations population.
  { path: "rulesAndRegs.created_by", select: "_id name icon" },
  { path: "rulesAndRegs.history.updatedBy", select: "_id name icon" },
  { path: "rulesAndRegs.pendingChanges.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.pendingChanges.votes.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.created_by", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.history.updatedBy", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.pendingChanges.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.pendingChanges.votes.competitor", select: "_id name icon" },
  // History population.
  { path: "history.adjudicator.current", select: "_id name icon" },
  { path: "history.adjudicator.history.adjudicator", select: "_id name icon" },
  { path: "history.drivers" },
  { path: "history.rounds.competitors.competitor", select: "_id name icon" },
  { path: "history.rounds.competitors.bet" },
  { path: "history.rounds.winner", select: "_id name icon" },
  { path: "history.rounds.runnerUp", select: "_id name icon" },
]

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
        .populate("driverGroup", "_id name")
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
        driverGroup,
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
        driverGroup,
      })

      // Validate driver group exists.
      const group = await DriverGroup.findById(driverGroup)
      if (!group) {
        return throwError("driverGroup", driverGroup, "Driver group not found.")
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

      // Create initial round with the creator as the only competitor.
      const initialRound: Round = {
        round: 1,
        status: "waiting",
        winner: null,
        runnerUp: null,
        competitors: [createCompetitorEntry(user._id, 0, 1)],
      }

      // Create the championship document.
      const champ = new Champ({
        name,
        icon: icon || "",
        profile_picture: profile_picture || "",
        season: 1,
        active: true,
        rounds: [initialRound],
        driverGroup: new ObjectId(driverGroup),
        pointsStructure,
        adjudicator: {
          current: user._id,
          fromDateTime: moment().format(),
          history: [],
        },
        rulesAndRegs: processedRulesAndRegs,
        settings: {
          inviteOnly: inviteOnly || false,
          maxCompetitors: maxCompetitors || 24,
        },
        champBadges: [],
        waitingList: [],
        history: [],
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

      // Update driver group with championship reference.
      group.championships.push(newChamp._id)
      await group.save()

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
}

export default champResolvers
