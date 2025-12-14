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
    ],
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
