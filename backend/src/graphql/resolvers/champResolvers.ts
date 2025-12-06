import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Champ, { champType } from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
import DriverGroup from "../../models/driverGroup"
import Badge from "../../models/badge"
import { ObjectId } from "mongodb"
import { champNameErrors, falsyValErrors, throwError, userErrors } from "./resolverErrors"

// Input types for the createChamp mutation
interface PointsStructureInput {
  result: number
  points: number
}

interface RuleOrRegSubsectionInput {
  text: string
}

interface RuleOrRegInput {
  text: string
  subsections?: RuleOrRegSubsectionInput[]
}

interface RulesAndRegsInput {
  default: boolean
  list: RuleOrRegInput[]
}

interface ChampBadgeInput {
  _id?: string
  url?: string
  name?: string
  rarity?: number
  awardedHow?: string
  awardedDesc?: string
  zoom?: number
  isDefault: boolean
}

interface RoundInput {
  round: number
  completed: boolean
}

export interface ChampInput {
  name: string
  icon?: string
  profile_picture?: string
  rounds: RoundInput[]
  driverGroup: string
  inviteOnly?: boolean
  maxCompetitors?: number
  pointsStructure: PointsStructureInput[]
  rulesAndRegs: RulesAndRegsInput
  champBadges: ChampBadgeInput[]
}

// Generates empty results array for a competitor with all rounds initialized to 0 points
const generateEmptyResults = (rounds: RoundInput[]) => {
  return rounds.map((r) => ({
    round: r.round,
    points: 0,
  }))
}

const champResolvers = {
  // Fetches a championship by ID with all populated references.
  getChampById: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<champType> => {
    if (!req.isAuth) {
      throwError("getChampById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)
        .populate("standings.competitor")
        .populate("adjudicator.current")
        .populate("adjudicator.history.adjudicator")
        .populate({
          path: "driverGroup",
          populate: { path: "drivers" }
        })
        .populate("champBadges")
        .exec()

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
  ): Promise<{ array: champType[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getChamps", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Populate competitor and adjudicator data.
      const champs = await Champ.find({})
        .populate("standings.competitor", "_id icon")
        .populate("adjudicator.current", "_id")
        .exec()

      return {
        array: champs,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Creates a new championship with all associated data
  createChamp: async (args: { champInput: ChampInput }, req: AuthRequest): Promise<champType> => {
    if (!req.isAuth) {
      throwError("createChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const {
        name,
        icon,
        profile_picture,
        rounds,
        driverGroup,
        inviteOnly,
        maxCompetitors,
        pointsStructure,
        rulesAndRegs,
        champBadges,
      } = args.champInput

      // Validate user exists
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Check for errors
      await champNameErrors(name)
      falsyValErrors({
        champName: name,
        rounds,
        driverGroup,
      })

      // Validate driver group exists
      const group = await DriverGroup.findById(driverGroup)
      if (!group) {
        return throwError("driverGroup", driverGroup, "Driver group not found.")
      }

      // Validate rounds
      if (!rounds || rounds.length < 1 || rounds.length > 30) {
        throwError("rounds", rounds, "Rounds must be between 1 and 30.")
      }

      // Validate points structure
      if (!pointsStructure || pointsStructure.length === 0) {
        throwError("pointsStructure", pointsStructure, "Points structure is required.")
      }

      // Build rules and regs with user references
      const processedRulesAndRegs = {
        default: rulesAndRegs.default,
        list: rulesAndRegs.list.map((rule) => ({
          text: rule.text,
          created_by: user._id,
          created_at: moment().format(),
          history: [],
          subsections:
            rule.subsections?.map((sub) => ({
              text: sub.text,
              created_by: user._id,
              created_at: moment().format(),
              history: [],
            })) || [],
        })),
      }

      // Transform rounds to include empty bets array
      const roundsWithBets = rounds.map((r) => ({
        round: r.round,
        completed: r.completed,
        bets: [],
      }))

      // Create the championship document
      const champ = new Champ({
        name,
        icon: icon || "",
        profile_picture: profile_picture || "",
        season: 1,
        rounds: roundsWithBets,
        standings: [
          {
            competitor: user._id,
            active: true,
            status: "competitor",
            results: generateEmptyResults(rounds),
          },
        ],
        adjudicator: {
          current: user._id,
          since: moment().format(),
          rounds: [],
          history: [],
        },
        driverGroup: new ObjectId(driverGroup),
        pointsStructure,
        rulesAndRegs: processedRulesAndRegs,
        protests: [],
        ruleChanges: [],
        settings: {
          inviteOnly: inviteOnly || false,
          maxCompetitors: maxCompetitors || 24,
          inactiveCompetitors: false,
          protests: {
            protestsAlwaysVote: false,
            allowMultipleProtests: false,
          },
          ruleChanges: {
            ruleChangeAlwaysVote: true,
            allowMultipleRuleChanges: true,
            ruleChangeExpiry: "",
          },
          autoOpen: {
            auto: false,
            dateTime: "",
          },
          autoClose: {
            auto: false,
            dateTime: "",
          },
          audio: {
            enabled: false,
            auto: false,
            triggers: {
              open: [],
              close: [],
            },
          },
          wager: {
            allow: false,
            description: "",
            min: 0,
            max: 0,
            equal: false,
          },
        },
        champBadges: [],
        waitingList: [],
        history: {
          seasons: [1],
          names: [
            {
              name,
              created_at: moment().format(),
            },
          ],
          rounds: [],
          stats: {
            allTime: {
              mostCompetitors: 1,
              mostPoints: {
                competitor: user._id,
                points: 0,
              },
              mostBadgesGiven: {
                competitor: user._id,
                badgesNum: 0,
              },
              rarestBadgeGiven: {
                competitor: user._id,
                badge: user._id,
              },
              mostWins: {
                competitor: user._id,
                amount: 0,
              },
              mostRunnerUp: {
                competitor: user._id,
                amount: 0,
              },
              bestWinStreak: {
                competitor: user._id,
                amount: 0,
              },
              bestPointsStreak: {
                competitor: user._id,
                amount: 0,
              },
            },
            seasons: [],
          },
        },
        created_by: user._id,
        created_at: moment().format(),
        updated_at: moment().format(),
      })

      // Save the championship
      const newChamp = await champ.save()

      // Process badges - create custom badges with championship reference, collect all IDs.
      const badgeIds: ObjectId[] = []

      for (const badge of champBadges) {
        if (badge._id) {
          // Default badge - use existing ID.
          badgeIds.push(new ObjectId(badge._id))
        } else if (badge.url && badge.name) {
          // Custom badge - create new with championship reference.
          const newBadge = new Badge({
            url: badge.url,
            name: badge.name,
            rarity: badge.rarity ?? 0,
            awardedHow: badge.awardedHow,
            awardedDesc: badge.awardedDesc,
            zoom: badge.zoom ?? 100,
            championship: newChamp._id,
            isDefault: false,
          })
          await newBadge.save()
          badgeIds.push(newBadge._id)
        }
      }

      // Update championship with badge references.
      newChamp.champBadges = badgeIds
      await newChamp.save()

      // Update driver group with championship reference
      group.championships.push(newChamp._id)
      await group.save()

      // Update user with championship reference
      user.championships.push(newChamp._id)
      await user.save()

      // Return the created championship with tokens
      return {
        ...newChamp._doc,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Allows a user to join a championship.
  joinChamp: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<champType> => {
    if (!req.isAuth) {
      throwError("joinChamp", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("joinChamp", _id, "Championship not found!", 404)
      }

      // Validate user exists
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Check if user is already a competitor
      const isAlreadyCompetitor = champ.standings.some(
        (s) => s.competitor.toString() === req._id
      )
      if (isAlreadyCompetitor) {
        return throwError("joinChamp", req._id, "You are already a competitor in this championship!", 400)
      }

      // Check if championship is invite only
      if (champ.settings.inviteOnly) {
        return throwError("joinChamp", req._id, "This championship is invite only!", 403)
      }

      // Check if championship is full
      if (champ.standings.length >= champ.settings.maxCompetitors) {
        return throwError("joinChamp", req._id, "This championship is full!", 400)
      }

      // Generate empty results for all rounds
      const emptyResults = champ.rounds.map((r) => ({
        round: r.round,
        points: 0,
      }))

      // Add user to standings
      champ.standings.push({
        competitor: user._id,
        active: true,
        status: "competitor",
        results: emptyResults,
      })

      champ.updated_at = moment().format()
      await champ.save()

      // Add championship to user's championships
      user.championships.push(champ._id)
      await user.save()

      // Return populated championship
      const populatedChamp = await Champ.findById(_id)
        .populate("standings.competitor")
        .populate("adjudicator.current")
        .populate("adjudicator.history.adjudicator")
        .populate({
          path: "driverGroup",
          populate: { path: "drivers" }
        })
        .populate("champBadges")
        .exec()

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
  ): Promise<champType> => {
    if (!req.isAuth) {
      throwError("updateChampPP", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("updateChampPP", _id, "Championship not found!", 404)
      }

      // Verify user is the adjudicator
      if (champ.adjudicator.current.toString() !== req._id) {
        return throwError("updateChampPP", req._id, "Only the adjudicator can update championship images!", 403)
      }

      // Update icon and profile_picture
      champ.icon = icon
      champ.profile_picture = profile_picture
      champ.updated_at = moment().format()

      await champ.save()

      // Return populated championship
      const populatedChamp = await Champ.findById(_id)
        .populate("standings.competitor")
        .populate("adjudicator.current")
        .populate("adjudicator.history.adjudicator")
        .populate({
          path: "driverGroup",
          populate: { path: "drivers" }
        })
        .populate("champBadges")
        .exec()

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
