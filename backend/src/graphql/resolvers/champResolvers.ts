import moment from "moment"
import { AuthRequest } from "../../middleware/auth"
import Champ, {
  ChampType,
  CompetitorEntry,
  DriverEntry,
  TeamEntry,
  Round,
  RoundStatus,
  SeasonHistory,
} from "../../models/champ"
import User, { userTypeMongo } from "../../models/user"
import Series from "../../models/series"
import Team from "../../models/team"
import Badge from "../../models/badge"
import Protest from "../../models/protest"
import { ObjectId } from "mongodb"
import { champNameErrors, falsyValErrors, throwError, userErrors } from "./resolverErrors"
import { clientS3, deleteS3, filterChampForUser } from "../../shared/utility"
import { champPopulation } from "../../shared/population"
import { io } from "../../app"
import { broadcastRoundStatusChange, broadcastBetPlaced } from "../../socket/socketHandler"
import {
  scheduleCountdownTransition,
  scheduleResultsTransition,
  cancelTimer,
} from "../../socket/autoTransitions"
import { resultsHandler, checkRoundExpiry } from "./resolverUtility"

// Input types for the createChamp mutation.
export interface PointsStructureInput {
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

// Fisher-Yates shuffle for randomizing array order.
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Generates an empty round with the given round number.
const createEmptyRound = (roundNumber: number, competitors: CompetitorEntry[] = []): Round => ({
  round: roundNumber,
  status: "waiting",
  statusChangedAt: null, // Only set when status changes to an active state
  competitors,
  drivers: [],
  randomisedDrivers: [],
  teams: [],
  winner: null,
  runnerUp: null,
})

// Populates round data (competitors, drivers, teams) when transitioning from "waiting".
// Uses championship-level competitors as the roster, carries over totalPoints from previous round.
const populateRoundData = async (
  champ: ChampType,
  roundIndex: number,
): Promise<{ competitors: CompetitorEntry[]; drivers: DriverEntry[]; randomisedDrivers: DriverEntry[]; teams: TeamEntry[] }> => {
  const previousRoundIndex = roundIndex - 1
  const previousRound = previousRoundIndex >= 0 ? champ.rounds[previousRoundIndex] : null

  // Build map of totalPoints and positions from previous round for carry-over.
  const prevCompetitorData = new Map<string, { totalPoints: number; position: number }>(
    previousRound?.competitors.map((c) => [
      c.competitor.toString(),
      { totalPoints: c.totalPoints, position: c.position },
    ]) || [],
  )

  // Use championship-level competitors as the roster (source of truth).
  const roster = champ.competitors || []

  // Create entries for ALL championship competitors.
  const competitors: CompetitorEntry[] = roster.map((userId) => {
    const userIdStr = userId.toString()
    const prevData = prevCompetitorData.get(userIdStr)

    return {
      competitor: userId,
      bet: null,
      points: 0,
      totalPoints: prevData?.totalPoints || 0, // New joiners get 0.
      position: prevData?.position || roster.length, // New joiners start last.
      updated_at: null,
      created_at: null,
    }
  })

  // Fetch series to get drivers.
  const series = await Series.findById(champ.series)
  if (!series) {
    throw new Error("Series not found for championship")
  }

  // Build map of previous driver totalPoints for carry-over.
  const previousDrivers = previousRoundIndex >= 0 ? champ.rounds[previousRoundIndex].drivers : []
  const driverTotalsMap = new Map<string, number>(
    previousDrivers.map((d) => [d.driver.toString(), d.totalPoints]),
  )

  // Populate drivers from series.drivers.
  const drivers: DriverEntry[] = series.drivers.map((driverId) => ({
    driver: driverId,
    points: 0,
    totalPoints: driverTotalsMap.get(driverId.toString()) || 0,
    position: 0,
    positionDrivers: 0,
    positionActual: 0,
  }))

  // Find all teams that compete in this series.
  const seriesTeams = await Team.find({ series: champ.series })

  // Build map of previous team totalPoints for carry-over.
  const previousTeams = previousRoundIndex >= 0 ? champ.rounds[previousRoundIndex].teams : []
  const teamTotalsMap = new Map<string, number>(
    previousTeams.map((t) => [t.team.toString(), t.totalPoints]),
  )

  // Populate teams from teams in this series.
  const teams: TeamEntry[] = seriesTeams.map((team) => ({
    team: team._id,
    drivers: team.drivers,
    points: 0,
    totalPoints: teamTotalsMap.get(team._id.toString()) || 0,
    position: 0,
    positionConstructors: 0,
  }))

  // Create randomised driver order for betting_open display.
  const randomisedDrivers = shuffleArray(drivers)

  return { competitors, drivers, randomisedDrivers, teams }
}

// Priority map for round statuses (lower = more urgent).
const STATUS_PRIORITY: Record<RoundStatus, number> = {
  betting_open: 1,
  countDown: 2,
  betting_closed: 3,
  results: 4,
  waiting: 5,
  completed: 6,
}

// Lightweight return type for getMyTopChampionship.
export interface FloatingChampType {
  _id: string
  name: string
  icon: string
  currentRoundStatus: RoundStatus
  currentRound: number
  totalRounds: number
  tokens: string[]
}

const champResolvers = {
  // Returns the user's most actionable championship (lightweight for FloatingChampCard).
  // Prioritizes by round status urgency, then by most recently updated.
  getMyTopChampionship: async (
    _args: Record<string, never>,
    req: AuthRequest,
  ): Promise<FloatingChampType | null> => {
    if (!req.isAuth) {
      throwError("getMyTopChampionship", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // Find championships where user is a competitor (minimal projection).
      const userChamps = await Champ.find(
        { competitors: new ObjectId(req._id) },
        { _id: 1, name: 1, icon: 1, rounds: 1, updated_at: 1 },
      ).exec()

      if (userChamps.length === 0) {
        return null
      }

      // Get current round status and number for each championship.
      const champsWithStatus = userChamps.map((champ) => {
        const currentRoundObj = champ.rounds.find((r) => r.status !== "completed") || champ.rounds[champ.rounds.length - 1]
        const currentRoundStatus: RoundStatus = currentRoundObj?.status || "completed"
        const currentRound = currentRoundObj?.round || champ.rounds.length
        return {
          champ,
          currentRoundStatus,
          currentRound,
          priority: STATUS_PRIORITY[currentRoundStatus],
        }
      })

      // Sort by priority (ascending), then by updated_at (descending).
      champsWithStatus.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return new Date(b.champ.updated_at).getTime() - new Date(a.champ.updated_at).getTime()
      })

      const topChamp = champsWithStatus[0]

      return {
        _id: topChamp.champ._id.toString(),
        name: topChamp.champ.name,
        icon: topChamp.champ.icon || "",
        currentRoundStatus: topChamp.currentRoundStatus,
        currentRound: topChamp.currentRound,
        totalRounds: topChamp.champ.rounds.length,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },

  // Fetches a championship by ID with all populated references.
  getChampById: async ({ _id }: { _id: string }, req: AuthRequest): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("getChampById", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      // First fetch unpopulated champ to check for 24h expiry.
      const unpopulatedChamp = await Champ.findById(_id)

      if (!unpopulatedChamp) {
        return throwError("getChampById", _id, "Championship not found!", 404)
      }

      // Lazy migration: If competitors array is empty, derive from current round.
      if (!unpopulatedChamp.competitors || unpopulatedChamp.competitors.length === 0) {
        const currentRound =
          unpopulatedChamp.rounds.find((r) => r.status !== "completed") ||
          unpopulatedChamp.rounds[0]
        if (currentRound && currentRound.competitors.length > 0) {
          unpopulatedChamp.competitors = currentRound.competitors.map((c) => c.competitor)
          await unpopulatedChamp.save()
          console.log(
            `[getChampById] Migrated ${unpopulatedChamp.competitors.length} competitors for championship ${_id}`,
          )
        }
      }

      // Check if any active round has expired (24h without change).
      // This resets to "waiting" and clears bets if expired.
      await checkRoundExpiry(unpopulatedChamp)

      // Now fetch the populated version for return.
      const champ = await Champ.findById(_id).populate(champPopulation).exec()

      if (!champ) {
        return throwError("getChampById", _id, "Championship not found!", 404)
      }

      // Check if user is admin to determine if admin settings should be visible.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true

      return filterChampForUser({
        ...champ._doc,
        tokens: req.tokens,
      }, isAdmin)
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

      // Check if user is admin to determine if admin settings should be visible.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true

      return {
        array: champs.map(champ => filterChampForUser(champ._doc || champ, isAdmin)),
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
      if (roundCount > 99) {
        throwError("rounds", rounds, "Maximum 99 rounds allowed.")
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
          admin: {
            adjCanSeeBadges: true,
          },
        },
        champBadges: [],
        competitors: [user._id], // Creator is the first competitor.
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
            // Set championship reference on non-default badges (two-way link).
            if (!badge.isDefault) {
              badge.championship = newChamp._id
              await badge.save()
            }
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
      // Filter admin settings for non-admin users.
      const isAdmin = user?.permissions?.admin === true

      return filterChampForUser({
        ...newChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
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

      // Check if user is already a competitor in the championship.
      const isAlreadyCompetitor = champ.competitors.some((c) => c.toString() === req._id)
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

      // Check if championship is full (based on championship-level competitors).
      if (champ.competitors.length >= champ.settings.maxCompetitors) {
        return throwError("joinChamp", req._id, "This championship is full!", 400)
      }

      // Check if current round is in waiting status - can only join between rounds.
      if (currentRound.status !== "waiting") {
        return throwError(
          "joinChamp",
          req._id,
          "Cannot join while a round is in progress. Please wait until the current round is completed.",
          400,
        )
      }

      // Add user to championship-level competitors (the roster).
      champ.competitors.push(user._id)

      // Calculate position for the new competitor (last place in current round).
      const newPosition = currentRound.competitors.length + 1

      // Add user to the current round's competitors for immediate participation.
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

      // Filter admin settings for non-admin users.
      const isAdmin = user?.permissions?.admin === true

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Updates the status of a round (adjudicator or admin only).
  updateRoundStatus: async (
    {
      _id,
      input,
    }: {
      _id: string
      input: { roundIndex: number; status: RoundStatus }
    },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("updateRoundStatus", req.isAuth, "Not Authenticated!", 401)
    }

    const { roundIndex, status } = input

    // Define allowed transitions between round statuses.
    const allowedTransitions: Record<RoundStatus, RoundStatus[]> = {
      waiting: ["countDown"],
      countDown: ["betting_open"],
      betting_open: ["betting_closed"],
      betting_closed: ["results"],
      results: ["completed"],
      completed: [],
    }

    // Validate status is a valid RoundStatus.
    if (!(status in allowedTransitions)) {
      return throwError("updateRoundStatus", status, "Invalid round status!", 400)
    }

    try {
      const champ = await Champ.findById(_id)
      if (!champ) {
        return throwError("updateRoundStatus", _id, "Championship not found!", 404)
      }

      // Verify user is adjudicator or admin.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id

      if (!isAdmin && !isAdjudicator) {
        return throwError(
          "updateRoundStatus",
          req._id,
          "Only adjudicator or admin can update round status!",
          403,
        )
      }

      // Validate round index.
      if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
        return throwError("updateRoundStatus", roundIndex, "Invalid round index!", 400)
      }

      const currentStatus = champ.rounds[roundIndex].status

      // Validate transition is allowed.
      if (!allowedTransitions[currentStatus].includes(status)) {
        return throwError(
          "updateRoundStatus",
          status,
          `Cannot transition from '${currentStatus}' to '${status}'!`,
          400,
        )
      }

      // When transitioning FROM "waiting", populate competitors/drivers/teams.
      if (currentStatus === "waiting") {
        const roundData = await populateRoundData(champ, roundIndex)
        champ.rounds[roundIndex].competitors = roundData.competitors
        champ.rounds[roundIndex].drivers = roundData.drivers
        champ.rounds[roundIndex].randomisedDrivers = roundData.randomisedDrivers
        champ.rounds[roundIndex].teams = roundData.teams
      }

      // Cancel any existing timer for this round.
      cancelTimer(_id, roundIndex)

      // Determine actual status to set based on skip settings.
      let actualStatus: RoundStatus = status

      // Skip countDown: go directly to betting_open.
      if (status === "countDown" && champ.settings.skipCountDown) {
        actualStatus = "betting_open"
      }

      // Skip results: process results but go directly to completed.
      if (status === "results" && champ.settings.skipResults) {
        // Execute resultsHandler first (needed for next round setup).
        await resultsHandler(_id, roundIndex)
        actualStatus = "completed"
      }

      // Update the round status and timestamp for expiry tracking.
      champ.rounds[roundIndex].status = actualStatus
      champ.rounds[roundIndex].statusChangedAt = moment().format()
      champ.updated_at = moment().format()
      await champ.save()

      // Schedule auto-transitions only if not skipping.
      if (status === "countDown" && !champ.settings.skipCountDown) {
        scheduleCountdownTransition(io, _id, roundIndex)
      } else if (status === "results" && !champ.settings.skipResults) {
        // Execute resultsHandler to process results (points, badges, next round setup).
        await resultsHandler(_id, roundIndex)
        scheduleResultsTransition(io, _id, roundIndex)
      }

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("updateRoundStatus", _id, "Championship not found after update!", 404)
      }

      // Broadcast status change to all users viewing this championship.
      // Include populated round data when transitioning from "waiting".
      if (currentStatus === "waiting") {
        const populatedRound = populatedChamp.rounds[roundIndex]
        broadcastRoundStatusChange(io, _id, roundIndex, actualStatus, {
          drivers: populatedRound.drivers,
          competitors: populatedRound.competitors,
          teams: populatedRound.teams,
        })
      } else {
        broadcastRoundStatusChange(io, _id, roundIndex, actualStatus)
      }

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Places a bet on a driver for a round.
  // Each driver can only be bet on by ONE competitor (first-come-first-serve).
  placeBet: async (
    {
      _id,
      input,
    }: {
      _id: string
      input: { roundIndex: number; driverId: string }
    },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("placeBet", req.isAuth, "Not Authenticated!", 401)
    }

    const { roundIndex, driverId } = input

    try {
      const champ = await Champ.findById(_id)
      if (!champ) {
        return throwError("placeBet", _id, "Championship not found!", 404)
      }

      // Validate round index.
      if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
        return throwError("placeBet", roundIndex, "Invalid round index!", 400)
      }

      const round = champ.rounds[roundIndex]

      // Validate round status is betting_open.
      if (round.status !== "betting_open") {
        return throwError(
          "placeBet",
          round.status,
          "Betting is not currently open for this round!",
          400,
        )
      }

      // Find the user's competitor entry in this round.
      const competitorIndex = round.competitors.findIndex(
        (c) => c.competitor.toString() === req._id,
      )
      if (competitorIndex === -1) {
        return throwError(
          "placeBet",
          req._id,
          "You are not a competitor in this championship!",
          403,
        )
      }

      const competitor = round.competitors[competitorIndex]
      const previousDriverId = competitor.bet ? competitor.bet.toString() : null

      // If user is trying to bet on the same driver they already have, no-op.
      if (previousDriverId === driverId) {
        const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()
        const user = await User.findById(req._id)
        const isAdmin = user?.permissions?.admin === true
        return filterChampForUser({
          ...populatedChamp!._doc,
          tokens: req.tokens,
        }, isAdmin)
      }

      // Check if the driver is already taken by another competitor.
      // This uses an atomic update to prevent race conditions.
      const driverObjectId = new ObjectId(driverId)

      // Build the atomic update condition:
      // - The driver must not be bet on by any OTHER competitor in this round.
      const otherCompetitorWithDriver = round.competitors.find(
        (c) => c.bet?.toString() === driverId && c.competitor.toString() !== req._id,
      )

      if (otherCompetitorWithDriver) {
        return throwError(
          "placeBet",
          driverId,
          "This driver has already been selected by another competitor!",
          409,
        )
      }

      // Update the competitor's bet atomically using findOneAndUpdate.
      // This ensures that between our check and update, no one else takes the driver.
      const updateResult = await Champ.findOneAndUpdate(
        {
          _id: new ObjectId(_id),
          // Ensure the driver is still not taken by checking again in the query.
          [`rounds.${roundIndex}.competitors`]: {
            $not: {
              $elemMatch: {
                bet: driverObjectId,
                competitor: { $ne: new ObjectId(req._id) },
              },
            },
          },
        },
        {
          $set: {
            [`rounds.${roundIndex}.competitors.${competitorIndex}.bet`]: driverObjectId,
            [`rounds.${roundIndex}.competitors.${competitorIndex}.updated_at`]: moment().format(),
            [`rounds.${roundIndex}.competitors.${competitorIndex}.created_at`]:
              competitor.created_at || moment().format(),
            updated_at: moment().format(),
          },
        },
        { new: true },
      )

      if (!updateResult) {
        // The atomic update failed - another user took the driver between check and update.
        return throwError(
          "placeBet",
          driverId,
          "This driver has already been selected by another competitor!",
          409,
        )
      }

      // Broadcast the bet immediately to all users in the championship room.
      broadcastBetPlaced(io, _id, roundIndex, req._id as string, driverId, previousDriverId)

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("placeBet", _id, "Championship not found after update!", 404)
      }

      // Filter admin settings for non-admin users.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Submits driver positions after betting closes (adjudicator or admin only).
  // This saves the actual qualifying positions and triggers points calculation.
  submitDriverPositions: async (
    {
      _id,
      input,
    }: {
      _id: string
      input: {
        roundIndex: number
        driverPositions: { driverId: string; positionActual: number }[]
      }
    },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("submitDriverPositions", req.isAuth, "Not Authenticated!", 401)
    }

    const { roundIndex, driverPositions } = input

    try {
      const champ = await Champ.findById(_id)
      if (!champ) {
        return throwError("submitDriverPositions", _id, "Championship not found!", 404)
      }

      // Verify user is adjudicator or admin.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id

      if (!isAdmin && !isAdjudicator) {
        return throwError(
          "submitDriverPositions",
          req._id,
          "Only adjudicator or admin can submit driver positions!",
          403,
        )
      }

      // Validate round index.
      if (roundIndex < 0 || roundIndex >= champ.rounds.length) {
        return throwError("submitDriverPositions", roundIndex, "Invalid round index!", 400)
      }

      const round = champ.rounds[roundIndex]

      // Validate round status is betting_closed.
      if (round.status !== "betting_closed") {
        return throwError(
          "submitDriverPositions",
          round.status,
          "Can only submit positions when betting is closed!",
          400,
        )
      }

      // Validate all drivers are included.
      if (driverPositions.length !== round.drivers.length) {
        return throwError(
          "submitDriverPositions",
          driverPositions.length,
          `Expected ${round.drivers.length} driver positions, got ${driverPositions.length}!`,
          400,
        )
      }

      // Validate positions are sequential 1 to N.
      const positions = driverPositions.map((dp) => dp.positionActual).sort((a, b) => a - b)
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] !== i + 1) {
          return throwError(
            "submitDriverPositions",
            positions,
            "Positions must be sequential from 1 to N!",
            400,
          )
        }
      }

      // Update positionActual for each driver in both drivers and randomisedDrivers arrays.
      driverPositions.forEach(({ driverId, positionActual }) => {
        const driverEntry = round.drivers.find((d) => d.driver.toString() === driverId)
        if (driverEntry) {
          driverEntry.positionActual = positionActual
        }
        const randomDriverEntry = round.randomisedDrivers?.find(
          (d) => d.driver.toString() === driverId,
        )
        if (randomDriverEntry) {
          randomDriverEntry.positionActual = positionActual
        }
      })

      // Transition to "results" status - this triggers resultsHandler which calculates points.
      round.status = "results"
      round.statusChangedAt = moment().format()

      champ.updated_at = moment().format()
      await champ.save()

      // Call resultsHandler to calculate points and populate next round.
      await resultsHandler(_id, roundIndex)

      // Re-save after resultsHandler modifies the champ.
      const updatedChamp = await Champ.findById(_id)
      if (updatedChamp) {
        await updatedChamp.save()
      }

      // Broadcast status change to all users viewing this championship.
      broadcastRoundStatusChange(io, _id, roundIndex, "results")

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("submitDriverPositions", _id, "Championship not found after update!", 404)
      }

      console.log(
        `[submitDriverPositions] Championship ${_id} round ${roundIndex + 1}: ` +
          `Positions submitted, transitioning to results`,
      )

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Updates championship profile picture (admin or adjudicator only).
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

      // Verify user is admin or adjudicator.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id

      if (!isAdmin && !isAdjudicator) {
        return throwError(
          "updateChampPP",
          req._id,
          "Only an admin or the adjudicator can update championship images!",
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

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Updates championship settings (admin or adjudicator only).
  updateChampSettings: async (
    {
      _id,
      settings,
    }: {
      _id: string
      settings: {
        name?: string
        skipCountDown?: boolean
        skipResults?: boolean
        inviteOnly?: boolean
        active?: boolean
        competitorsCanBet?: boolean
        rounds?: number
        maxCompetitors?: number
        pointsStructure?: PointsStructureInput[]
        icon?: string
        profile_picture?: string
        automation?: {
          enabled?: boolean
          bettingWindow?: {
            autoOpen?: boolean
            autoOpenTime?: number
            autoClose?: boolean
            autoCloseTime?: number
          }
          round?: {
            autoNextRound?: boolean
            autoNextRoundTime?: number
          }
        }
        protests?: {
          alwaysVote?: boolean
          allowMultiple?: boolean
          expiry?: number
        }
        ruleChanges?: {
          alwaysVote?: boolean
          allowMultiple?: boolean
          expiry?: number
        }
        series?: string
      }
    },
    req: AuthRequest,
  ): Promise<ChampType> => {
    const {
      name,
      skipCountDown,
      skipResults,
      inviteOnly,
      active,
      rounds,
      maxCompetitors,
      pointsStructure,
      icon,
      profile_picture,
      automation,
      protests,
      ruleChanges,
      series,
      competitorsCanBet,
    } = settings
    if (!req.isAuth) {
      throwError("updateChampSettings", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("updateChampSettings", _id, "Championship not found!", 404)
      }

      // Verify user is admin or adjudicator.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true
      const isAdjudicator = champ.adjudicator.current.toString() === req._id

      if (!isAdmin && !isAdjudicator) {
        return throwError(
          "updateChampSettings",
          req._id,
          "Only an admin or the adjudicator can update championship settings!",
          403,
        )
      }

      // Update name if provided and different.
      if (name && name !== champ.name) {
        await champNameErrors(name)
        champ.name = name
      }

      // Update skipCountDown if provided.
      if (typeof skipCountDown === "boolean") {
        champ.settings.skipCountDown = skipCountDown
      }

      // Update skipResults if provided.
      if (typeof skipResults === "boolean") {
        champ.settings.skipResults = skipResults
      }

      // Update competitorsCanBet if provided.
      if (typeof competitorsCanBet === "boolean") {
        champ.settings.competitorsCanBet = competitorsCanBet
      }

      // Update inviteOnly if provided.
      if (typeof inviteOnly === "boolean") {
        champ.settings.inviteOnly = inviteOnly
      }

      // Update active if provided.
      if (typeof active === "boolean") {
        champ.active = active
      }

      // Update icon if provided.
      if (icon) {
        champ.icon = icon
      }

      // Update profile_picture if provided.
      if (profile_picture) {
        champ.profile_picture = profile_picture
      }

      // Update series if provided and different.
      if (series && series !== champ.series.toString()) {
        // Only allow series change if all rounds are waiting.
        const allWaiting = champ.rounds.every((r) => r.status === "waiting")
        if (!allWaiting) {
          return throwError(
            "updateChampSettings",
            series,
            "Cannot change series after season has started!",
            400,
          )
        }

        // Validate new series exists.
        const newSeries = await Series.findById(series)
        if (!newSeries) {
          return throwError("updateChampSettings", series, "Series not found!", 404)
        }

        // Remove championship from old series.championships array.
        await Series.findByIdAndUpdate(champ.series, {
          $pull: { championships: champ._id },
        })

        // Add championship to new series.championships array.
        await Series.findByIdAndUpdate(series, {
          $push: { championships: champ._id },
        })

        // Update championship's series reference.
        champ.series = new ObjectId(series)

        // If automation was enabled but new series doesn't support it, disable.
        if (
          champ.settings.automation?.enabled &&
          !newSeries.hasAPI
        ) {
          champ.settings.automation.enabled = false
        }
      }

      // Update maxCompetitors if provided.
      if (typeof maxCompetitors === "number") {
        // Validate: can't set below current competitor count.
        const currentCompetitorCount = champ.competitors?.length || 0
        if (maxCompetitors < currentCompetitorCount) {
          return throwError(
            "maxCompetitors",
            maxCompetitors,
            `Cannot set max competitors below current count of ${currentCompetitorCount}.`,
            400,
          )
        }
        // Validate: maximum 99 competitors.
        if (maxCompetitors > 99) {
          return throwError(
            "maxCompetitors",
            maxCompetitors,
            "Maximum 99 competitors allowed.",
            400,
          )
        }
        champ.settings.maxCompetitors = maxCompetitors
      }

      // Calculate non-waiting rounds count for validation.
      const nonWaitingRoundsCount = champ.rounds.filter((r) => r.status !== "waiting").length
      const allRoundsWaiting = nonWaitingRoundsCount === 0

      // Update rounds if provided.
      if (typeof rounds === "number") {
        // Validate: maximum 99 rounds.
        if (rounds > 99) {
          return throwError("rounds", rounds, "Maximum 99 rounds allowed.", 400)
        }

        // Validate: minimum is non-waiting rounds + 1 (must keep at least 1 waiting round).
        const minRounds = nonWaitingRoundsCount + 1
        if (rounds < minRounds) {
          return throwError(
            "rounds",
            rounds,
            `Cannot reduce rounds below ${minRounds}. Must keep at least 1 waiting round.`,
            400,
          )
        }

        const currentRoundsCount = champ.rounds.length

        if (rounds > currentRoundsCount) {
          // Add new waiting rounds.
          for (let i = currentRoundsCount + 1; i <= rounds; i++) {
            champ.rounds.push(createEmptyRound(i))
          }
        } else if (rounds < currentRoundsCount) {
          // Remove rounds from the end (only waiting rounds can be removed).
          // Slice to keep only the first 'rounds' number of rounds.
          champ.rounds = champ.rounds.slice(0, rounds)
        }
      }

      // Update points structure if provided.
      if (pointsStructure && pointsStructure.length > 0) {
        // Validate: can only change points structure if season hasn't started.
        if (!allRoundsWaiting) {
          return throwError(
            "pointsStructure",
            pointsStructure,
            "Cannot change points structure after the season has started.",
            400,
          )
        }

        champ.pointsStructure = pointsStructure
      }

      // Update automation settings if provided.
      if (automation) {
        if (typeof automation.enabled === "boolean") {
          champ.settings.automation.enabled = automation.enabled
        }

        // Update betting window settings if provided.
        if (automation.bettingWindow) {
          const { autoOpen, autoOpenTime, autoClose, autoCloseTime } = automation.bettingWindow

          if (typeof autoOpen === "boolean") {
            champ.settings.automation.bettingWindow.autoOpen = autoOpen
          }

          if (typeof autoOpenTime === "number") {
            // Validate: maximum 30 minutes before qualifying.
            if (autoOpenTime < 1 || autoOpenTime > 30) {
              return throwError(
                "autoOpenTime",
                autoOpenTime,
                "Auto open time must be between 1 and 30 minutes.",
                400,
              )
            }
            champ.settings.automation.bettingWindow.autoOpenTime = autoOpenTime
          }

          if (typeof autoClose === "boolean") {
            champ.settings.automation.bettingWindow.autoClose = autoClose
          }

          if (typeof autoCloseTime === "number") {
            // Validate: maximum 10 minutes after qualifying starts.
            if (autoCloseTime < 1 || autoCloseTime > 10) {
              return throwError(
                "autoCloseTime",
                autoCloseTime,
                "Auto close time must be between 1 and 10 minutes.",
                400,
              )
            }
            champ.settings.automation.bettingWindow.autoCloseTime = autoCloseTime
          }
        }

        // Update round automation settings if provided.
        if (automation.round) {
          const { autoNextRound, autoNextRoundTime } = automation.round

          if (typeof autoNextRound === "boolean") {
            champ.settings.automation.round.autoNextRound = autoNextRound
          }

          if (typeof autoNextRoundTime === "number") {
            // Validate: between 1 and 99 minutes after qualifying finishes.
            if (autoNextRoundTime < 1 || autoNextRoundTime > 99) {
              return throwError(
                "autoNextRoundTime",
                autoNextRoundTime,
                "Auto next round time must be between 1 and 99 minutes.",
                400,
              )
            }
            champ.settings.automation.round.autoNextRoundTime = autoNextRoundTime
          }
        }
      }

      // Update protests settings if provided.
      if (protests) {
        const { alwaysVote, allowMultiple, expiry } = protests

        if (typeof alwaysVote === "boolean") {
          champ.settings.protests.alwaysVote = alwaysVote
        }

        if (typeof allowMultiple === "boolean") {
          champ.settings.protests.allowMultiple = allowMultiple
        }

        if (typeof expiry === "number") {
          // Validate: expiry must be between 1 and 30 days (1440 to 43200 minutes).
          if (expiry < 1440 || expiry > 43200) {
            return throwError(
              "protestsExpiry",
              expiry,
              "Protests expiry must be between 1 and 30 days.",
              400,
            )
          }
          champ.settings.protests.expiry = expiry
        }
      }

      // Update rule changes settings if provided.
      if (ruleChanges) {
        const { alwaysVote, allowMultiple, expiry } = ruleChanges

        if (typeof alwaysVote === "boolean") {
          champ.settings.ruleChanges.alwaysVote = alwaysVote
        }

        if (typeof allowMultiple === "boolean") {
          champ.settings.ruleChanges.allowMultiple = allowMultiple
        }

        if (typeof expiry === "number") {
          // Validate: expiry must be between 1 and 30 days (1440 to 43200 minutes).
          if (expiry < 1440 || expiry > 43200) {
            return throwError(
              "ruleChangesExpiry",
              expiry,
              "Rule changes expiry must be between 1 and 30 days.",
              400,
            )
          }
          champ.settings.ruleChanges.expiry = expiry
        }
      }

      champ.updated_at = moment().format()
      await champ.save()

      // Return populated championship.
      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("updateChampSettings", _id, "Championship not found after update!", 404)
      }

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
    } catch (err) {
      throw err
    }
  },

  // Updates admin-only settings for a championship. Only admins can access this.
  updateAdminSettings: async (
    {
      _id,
      settings,
    }: {
      _id: string
      settings: {
        adjCanSeeBadges?: boolean
      }
    },
    req: AuthRequest,
  ): Promise<ChampType> => {
    if (!req.isAuth) {
      throwError("updateAdminSettings", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const champ = await Champ.findById(_id)

      if (!champ) {
        return throwError("updateAdminSettings", _id, "Championship not found!", 404)
      }

      // Verify user is an admin - this is admin-only, not adjudicator.
      const user = await User.findById(req._id)
      const isAdmin = user?.permissions?.admin === true

      if (!isAdmin) {
        return throwError(
          "updateAdminSettings",
          req._id,
          "Only an admin can update admin settings!",
          403,
        )
      }

      // Update adjCanSeeBadges if provided.
      if (typeof settings.adjCanSeeBadges === "boolean") {
        if (!champ.settings.admin) {
          champ.settings.admin = { adjCanSeeBadges: true }
        }
        champ.settings.admin.adjCanSeeBadges = settings.adjCanSeeBadges
      }

      // Save and return populated championship.
      champ.updated_at = moment().format()
      await champ.save()

      const populatedChamp = await Champ.findById(_id).populate(champPopulation).exec()

      if (!populatedChamp) {
        return throwError("updateAdminSettings", _id, "Championship not found after update!", 404)
      }

      return filterChampForUser({
        ...populatedChamp._doc,
        tokens: req.tokens,
      }, isAdmin)
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
