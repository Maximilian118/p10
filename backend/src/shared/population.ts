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
        path: "created_by",
        model: "User",
      },
      {
        path: "series",
        model: "Series",
        select: "_id name",
      },
    ],
  },
  {
    path: "series",
    model: "Series",
    select: "_id name",
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
    populate: [
      {
        path: "created_by",
        model: "User",
      },
    ],
  },
  {
    path: "series",
    model: "Series",
    select: "_id url name championships",
    populate: {
      path: "championships",
      model: "Champ",
      select: "_id icon name",
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
]

// Population options for championship queries.
export const champPopulation = [
  {
    path: "rounds.competitors.competitor",
    select: "_id name icon profile_picture permissions created_at",
  },
  { path: "rounds.competitors.bet" },
  { path: "rounds.drivers.driver", select: "_id name icon driverID" },
  { path: "rounds.teams.team", select: "_id name icon emblem" },
  { path: "rounds.teams.drivers", select: "_id name icon driverID" },
  { path: "rounds.winner", select: "_id name icon" },
  { path: "rounds.runnerUp", select: "_id name icon" },
  { path: "adjudicator.current", select: "_id name icon profile_picture permissions created_at" },
  { path: "adjudicator.history.adjudicator", select: "_id name icon" },
  { path: "series", populate: { path: "drivers", populate: { path: "teams", model: "Team", select: "_id name icon emblem" } } },
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
  { path: "history.rounds.drivers.driver", select: "_id name icon driverID" },
  { path: "history.rounds.teams.team", select: "_id name icon emblem" },
  { path: "history.rounds.teams.drivers", select: "_id name icon driverID" },
  { path: "history.rounds.winner", select: "_id name icon" },
  { path: "history.rounds.runnerUp", select: "_id name icon" },
]
