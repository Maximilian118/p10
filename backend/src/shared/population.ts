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
]

// Population for a Driver Group.
export const driverGroupPopulation = [
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
