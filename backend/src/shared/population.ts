// Population for a Team.
export const teamPopulation = [
  {
    path: "created_by",
    model: "User",
  },
  {
    path: "drivers",
    model: "Driver",
    populate: [
      {
        path: "series",
        model: "Series",
        select: "_id name shortName championships",
        populate: {
          path: "championships",
          model: "Champ",
          select: "_id adjudicator",
          populate: {
            path: "adjudicator.current",
            model: "User",
            select: "_id",
          },
        },
      },
    ],
  },
  {
    path: "series",
    model: "Series",
    select: "_id name shortName championships",
    populate: {
      path: "championships",
      model: "Champ",
      select: "_id adjudicator",
      populate: {
        path: "adjudicator.current",
        model: "User",
        select: "_id",
      },
    },
  },
]

// Population for a Driver.
export const driverPopulation = [
  {
    path: "created_by",
    model: "User",
  },
  {
    path: "teams",
    model: "Team",
  },
  {
    path: "series",
    model: "Series",
    select: "_id icon profile_picture name shortName championships",
    populate: {
      path: "championships",
      model: "Champ",
      select: "_id icon name adjudicator",
      populate: {
        path: "adjudicator.current",
        model: "User",
        select: "_id",
      },
    },
  },
]

// Population for a Series.
export const seriesPopulation = [
  {
    path: "created_by",
    model: "User",
  },
  {
    path: "drivers",
    model: "Driver",
    populate: [...driverPopulation],
  },
  {
    path: "championships",
    model: "Champ",
    select: "_id adjudicator",
    populate: {
      path: "adjudicator.current",
      model: "User",
      select: "_id",
    },
  },
]

// Minimal population for rules mutations (avoids full champ population).
export const rulesAndRegsPopulation = [
  { path: "rulesAndRegs.created_by", select: "_id name icon" },
  { path: "rulesAndRegs.history.updatedBy", select: "_id name icon" },
  { path: "rulesAndRegs.pendingChanges.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.pendingChanges.votes.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.created_by", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.history.updatedBy", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.pendingChanges.competitor", select: "_id name icon" },
  { path: "rulesAndRegs.subsections.pendingChanges.votes.competitor", select: "_id name icon" },
]

// Population options for championship queries.
export const champPopulation = [
  {
    path: "rounds.competitors.competitor",
    select: "_id name icon profile_picture permissions created_at badges",
  },
  { path: "rounds.competitors.bet" },
  { path: "rounds.competitors.badgesAwarded", select: "_id url name customName rarity awardedHow awardedDesc zoom" },
  { path: "rounds.drivers.driver", select: "_id name icon driverID" },
  { path: "rounds.randomisedDrivers.driver", select: "_id name icon driverID" },
  { path: "rounds.teams.team", select: "_id name icon emblem" },
  { path: "rounds.teams.drivers", select: "_id name icon driverID" },
  { path: "rounds.winner", select: "_id name icon" },
  { path: "rounds.runnerUp", select: "_id name icon" },
  { path: "adjudicator.current", select: "_id name icon profile_picture permissions created_at" },
  { path: "adjudicator.history.adjudicator", select: "_id name icon" },
  { path: "series", populate: { path: "drivers", populate: { path: "teams", model: "Team", select: "_id name icon emblem" } } },
  { path: "competitors", select: "_id name icon profile_picture permissions created_at" },
  { path: "waitingList", select: "_id name icon" },
  { path: "banned", select: "_id name icon" },
  { path: "kicked", select: "_id name icon" },
  { path: "invited", select: "_id name icon" },
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
  { path: "history.rounds.competitors.badgesAwarded", select: "_id url name customName rarity awardedHow awardedDesc zoom" },
  { path: "history.rounds.drivers.driver", select: "_id name icon driverID" },
  { path: "history.rounds.randomisedDrivers.driver", select: "_id name icon driverID" },
  { path: "history.rounds.teams.team", select: "_id name icon emblem" },
  { path: "history.rounds.teams.drivers", select: "_id name icon driverID" },
  { path: "history.rounds.winner", select: "_id name icon" },
  { path: "history.rounds.runnerUp", select: "_id name icon" },
  // Badge population for badge stats display.
  { path: "champBadges", select: "_id" },
]

// Population for a Protest.
export const protestPopulation = [
  { path: "championship", select: "_id name icon" },
  { path: "competitor", select: "_id name icon" },
  { path: "accused", select: "_id name icon" },
  { path: "votes.competitor", select: "_id name icon" },
]

// Full population for a single league (detail view).
export const leaguePopulation = [
  { path: "series", select: "_id name shortName icon profile_picture rounds" },
  { path: "creator", select: "_id name icon" },
  { path: "championships.championship", select: "_id name icon profile_picture competitors" },
  { path: "championships.adjudicator", select: "_id name icon" },
  { path: "championships.scores.insights.contributions.competitor", select: "_id name icon" },
  { path: "championships.scores.insights.contributions.driver", select: "_id name icon driverID" },
  { path: "championships.scores.insights.bestPrediction.competitor", select: "_id name icon" },
  { path: "championships.scores.insights.bestPrediction.driver", select: "_id name icon driverID" },
  { path: "championships.scores.insights.worstPrediction.competitor", select: "_id name icon" },
  { path: "championships.scores.insights.worstPrediction.driver", select: "_id name icon driverID" },
]

// Lightweight population for league list view.
export const leagueListPopulation = [
  { path: "series", select: "_id name shortName icon rounds" },
  { path: "creator", select: "_id name icon" },
  { path: "championships.championship", select: "_id name icon profile_picture" },
]
