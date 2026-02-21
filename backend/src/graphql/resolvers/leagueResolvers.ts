import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import League, { LeagueType } from "../../models/league"
import Champ from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
import Series from "../../models/series"
import { ObjectId } from "mongodb"
import { leagueNameErrors, throwError, userErrors } from "./resolverErrors"
import { leaguePopulation, leagueListPopulation } from "../../shared/population"
import { isLeagueLocked, recalculateLeagueStandings } from "../../shared/leagueScoring"
import { createLogger } from "../../shared/logger"

const log = createLogger("LeagueResolver")

// Minimum number of competitors required for a championship to join a league.
const MIN_COMPETITORS_FOR_LEAGUE = 7

// Computes lock status for a league by resolving its series round count.
const computeLockStatus = async (
  league: LeagueType,
): Promise<{ locked: boolean; lockThreshold: number }> => {
  const series = await Series.findById(league.series?._id || league.series)
  const seriesRounds = series?.rounds ?? 0
  return isLeagueLocked(seriesRounds, league.championships)
}

// Fetches, populates, and returns a full league response with computed lock fields and tokens.
const buildLeagueResponse = async (
  leagueId: string | ObjectId,
  tokens: string[],
): Promise<LeagueType> => {
  const populated = await League.findById(leagueId).populate(leaguePopulation).exec()
  if (!populated) {
    return throwError("league", leagueId, "League not found after update!", 404)
  }

  const { locked, lockThreshold } = await computeLockStatus(populated)
  return { ...populated._doc, locked, lockThreshold, tokens }
}

const leagueResolvers = {
  // Returns all leagues with lightweight population.
  getLeagues: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<{ array: LeagueType[]; tokens: string[] }> => {
    if (!req.isAuth) {
      throwError("getLeagues", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const leagues = await League.find().populate(leagueListPopulation).exec()

      // Attach computed lock fields to each league.
      const leaguesWithLock = await Promise.all(
        leagues.map(async (league) => {
          const { locked, lockThreshold } = await computeLockStatus(league)
          return { ...league._doc, locked, lockThreshold }
        })
      )

      return {
        array: leaguesWithLock,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Returns a single league with full population.
  getLeagueById: async (
    { _id }: { _id: string },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("getLeagueById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      return await buildLeagueResponse(_id, req.tokens)
    } catch (err) {
      throw err
    }
  },

  // Creates a new league. Any authenticated user can create a league.
  createLeague: async (
    { input }: { input: { name: string; icon: string; profile_picture: string; series: string; maxChampionships?: number } },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("createLeague", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Validate league name.
      await leagueNameErrors(input.name)

      // Validate series exists and has rounds set.
      const series = await Series.findById(input.series)
      if (!series) {
        return throwError("createLeague", input.series, "Series not found!", 404)
      }
      if (!series.rounds) {
        return throwError(
          "createLeague",
          input.series,
          "This series does not have a fixed round count. Set rounds on the series before creating a league.",
          400,
        )
      }

      // Validate maxChampionships if provided.
      if (input.maxChampionships !== undefined && input.maxChampionships !== null) {
        if (input.maxChampionships < 2 || input.maxChampionships > 50) {
          return throwError("createLeague", input.maxChampionships, "Max championships must be between 2 and 50.", 400)
        }
      }

      // Create the league.
      const now = moment().format()
      const league = new League({
        name: input.name,
        icon: input.icon,
        profile_picture: input.profile_picture,
        series: new ObjectId(input.series),
        creator: new ObjectId(req._id),
        championships: [],
        settings: {
          maxChampionships: input.maxChampionships ?? 12,
        },
        created_at: now,
        updated_at: now,
      })

      await league.save()

      log.info(`League "${input.name}" created by user ${req._id}`)
      return await buildLeagueResponse(league._id, req.tokens)
    } catch (err) {
      throw err
    }
  },

  // Enrolls a championship into a league. Only the adjudicator can do this.
  joinLeague: async (
    { leagueId, champId }: { leagueId: string; champId: string },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("joinLeague", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Fetch league.
      const league = await League.findById(leagueId)
      if (!league) {
        return throwError("joinLeague", leagueId, "League not found!", 404)
      }

      // Fetch championship.
      const champ = await Champ.findById(champId)
      if (!champ) {
        return throwError("joinLeague", champId, "Championship not found!", 404)
      }

      // Verify user is the adjudicator of this championship.
      const isAdmin = user.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id
      if (!isAdmin && !isAdjudicator) {
        return throwError("joinLeague", req._id, "Only the adjudicator can enroll a championship in a league!", 403)
      }

      // Verify championship belongs to the same series as the league.
      if (champ.series.toString() !== league.series.toString()) {
        return throwError("joinLeague", champId, "Championship must belong to the same series as the league!", 400)
      }

      // Verify championship is not already in a league.
      if (champ.league) {
        return throwError("joinLeague", champId, "This championship is already in a league. Leave the current league first.", 400)
      }

      // Verify the series has rounds set.
      const series = await Series.findById(league.series)
      if (!series?.rounds) {
        return throwError("joinLeague", leagueId, "The league's series does not have a fixed round count.", 400)
      }

      // Verify league is not locked.
      const { locked } = isLeagueLocked(series.rounds, league.championships)
      if (locked) {
        return throwError("joinLeague", leagueId, "This league is locked. No more championships can join or leave.", 400)
      }

      // Verify league is not full.
      const activeMembers = league.championships.filter((c) => c.active)
      if (activeMembers.length >= league.settings.maxChampionships) {
        return throwError("joinLeague", leagueId, "This league is full!", 400)
      }

      // Verify championship has minimum competitors.
      if (champ.competitors.length < MIN_COMPETITORS_FOR_LEAGUE) {
        return throwError(
          "joinLeague",
          champId,
          `Championship must have at least ${MIN_COMPETITORS_FOR_LEAGUE} competitors to join a league.`,
          400,
        )
      }

      // Verify adjudicator doesn't already have another championship in this league.
      const adjudicatorId = champ.adjudicator.current.toString()
      const adjudicatorAlreadyInLeague = league.championships.some(
        (c) => c.active && c.adjudicator.toString() === adjudicatorId && c.championship.toString() !== champId,
      )
      if (adjudicatorAlreadyInLeague) {
        return throwError(
          "joinLeague",
          champId,
          "This adjudicator already has a championship in this league. Each adjudicator can only have one championship per league.",
          400,
        )
      }

      const now = moment().format()

      // Check for a previous inactive membership (rejoin scenario — preserve scores).
      const previousMember = league.championships.find(
        (c) => !c.active && c.championship.toString() === champId,
      )

      if (previousMember) {
        // Reactivate previous membership — all historical scores are preserved.
        previousMember.active = true
        previousMember.adjudicator = new ObjectId(adjudicatorId)
        previousMember.leftAt = undefined
        log.info(`Championship ${champId} rejoined league ${leagueId} with preserved scores`)
      } else {
        // New membership entry.
        league.championships.push({
          championship: new ObjectId(champId),
          adjudicator: new ObjectId(adjudicatorId),
          joinedAt: now,
          active: true,
          scores: [],
          cumulativeScore: 0,
          roundsCompleted: 0,
          cumulativeAverage: 0,
          position: 0,
        })
        log.info(`Championship ${champId} joined league ${leagueId}`)
      }

      // Recalculate standings with the new/reactivated member.
      recalculateLeagueStandings(league.championships)

      // Set league reference on the championship.
      champ.league = new ObjectId(leagueId)
      champ.updated_at = now
      await champ.save()

      // Save league.
      league.markModified("championships")
      league.updated_at = now
      await league.save()

      return await buildLeagueResponse(leagueId, req.tokens)
    } catch (err) {
      throw err
    }
  },

  // Removes a championship from a league. Only the adjudicator can do this.
  // Scores are preserved for potential rejoin.
  leaveLeague: async (
    { leagueId, champId }: { leagueId: string; champId: string },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("leaveLeague", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      // Fetch league.
      const league = await League.findById(leagueId)
      if (!league) {
        return throwError("leaveLeague", leagueId, "League not found!", 404)
      }

      // Fetch championship.
      const champ = await Champ.findById(champId)
      if (!champ) {
        return throwError("leaveLeague", champId, "Championship not found!", 404)
      }

      // Verify user is the adjudicator or admin.
      const isAdmin = user.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id
      if (!isAdmin && !isAdjudicator) {
        return throwError("leaveLeague", req._id, "Only the adjudicator can remove a championship from a league!", 403)
      }

      // Verify league is not locked.
      const series = await Series.findById(league.series)
      if (series?.rounds) {
        const { locked } = isLeagueLocked(series.rounds, league.championships)
        if (locked) {
          return throwError("leaveLeague", leagueId, "This league is locked. No more championships can join or leave.", 400)
        }
      }

      // Find the active membership.
      const member = league.championships.find(
        (c) => c.active && c.championship.toString() === champId,
      )
      if (!member) {
        return throwError("leaveLeague", champId, "Championship is not an active member of this league!", 400)
      }

      const now = moment().format()

      // Mark member as inactive (preserve scores for potential rejoin).
      member.active = false
      member.leftAt = now

      // Recalculate standings without the departing member.
      recalculateLeagueStandings(league.championships)

      // Clear league reference on the championship.
      champ.league = null
      champ.updated_at = now
      await champ.save()

      // Save league.
      league.markModified("championships")
      league.updated_at = now
      await league.save()

      log.info(`Championship ${champId} left league ${leagueId}`)
      return await buildLeagueResponse(leagueId, req.tokens)
    } catch (err) {
      throw err
    }
  },

  // Updates league settings. Only the league creator can do this.
  updateLeagueSettings: async (
    { _id, input }: { _id: string; input: { name?: string; icon?: string; profile_picture?: string; maxChampionships?: number } },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("updateLeagueSettings", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      const league = await League.findById(_id)
      if (!league) {
        return throwError("updateLeagueSettings", _id, "League not found!", 404)
      }

      // Verify user is the league creator or admin.
      const isAdmin = user.permissions?.admin === true
      const isCreator = league.creator.toString() === req._id
      if (!isAdmin && !isCreator) {
        return throwError("updateLeagueSettings", req._id, "Only the league creator can update settings!", 403)
      }

      // Update name if provided.
      if (input.name !== undefined && input.name !== null) {
        if (input.name !== league.name) {
          await leagueNameErrors(input.name)
          league.name = input.name
        }
      }

      // Update icon if provided.
      if (input.icon !== undefined && input.icon !== null) {
        league.icon = input.icon
      }

      // Update profile picture if provided.
      if (input.profile_picture !== undefined && input.profile_picture !== null) {
        league.profile_picture = input.profile_picture
      }

      // Update max championships if provided.
      if (input.maxChampionships !== undefined && input.maxChampionships !== null) {
        if (input.maxChampionships < 2 || input.maxChampionships > 50) {
          return throwError("updateLeagueSettings", input.maxChampionships, "Max championships must be between 2 and 50.", 400)
        }
        // Cannot reduce below current active count.
        const activeCount = league.championships.filter((c) => c.active).length
        if (input.maxChampionships < activeCount) {
          return throwError(
            "updateLeagueSettings",
            input.maxChampionships,
            `Cannot reduce max below current active member count (${activeCount}).`,
            400,
          )
        }
        league.settings.maxChampionships = input.maxChampionships
        league.markModified("settings")
      }

      league.updated_at = moment().format()
      await league.save()

      log.info(`League ${_id} settings updated by user ${req._id}`)
      return await buildLeagueResponse(_id, req.tokens)
    } catch (err) {
      throw err
    }
  },

  // Deletes a league. Only the league creator can do this.
  // Clears champ.league on all member championships.
  deleteLeague: async (
    { _id, confirmName }: { _id: string; confirmName: string },
    req: AuthRequest,
  ): Promise<LeagueType> => {
    if (!req.isAuth) {
      throwError("deleteLeague", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      const league = await League.findById(_id)
      if (!league) {
        return throwError("deleteLeague", _id, "League not found!", 404)
      }

      // Verify user is the league creator or admin.
      const isAdmin = user.permissions?.admin === true
      const isCreator = league.creator.toString() === req._id
      if (!isAdmin && !isCreator) {
        return throwError("deleteLeague", req._id, "Only the league creator can delete this league!", 403)
      }

      // Validate confirmation name.
      if (confirmName !== league.name) {
        return throwError("deleteLeague", confirmName, "League name does not match. Deletion cancelled.", 400)
      }

      // Clear champ.league for all member championships.
      const champIds = league.championships.map((c) => c.championship)
      if (champIds.length > 0) {
        await Champ.updateMany(
          { _id: { $in: champIds } },
          { $set: { league: null } },
        )
      }

      // Delete the league document.
      await League.findByIdAndDelete(_id)

      log.info(`League "${league.name}" deleted by user ${req._id}`)

      // Return the league data before deletion with tokens.
      return {
        ...league._doc,
        locked: false,
        lockThreshold: 0,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default leagueResolvers
