import { userType } from "./localStorage"
import { seriesType, driverType, teamType } from "./types"

// Initialize a new series with default values.
export const initSeries = (user: userType): seriesType => {
  return {
    created_by: user._id,
    url: "",
    name: "",
    championships: [],
    drivers: [],
  }
}

// Initialize a new driver with default values.
export const initDriver = (user: userType): driverType => {
  return {
    created_by: user._id,
    icon: "",
    profile_picture: "",
    body: "",
    name: "",
    driverID: "",
    teams: [],
    series: [],
    stats: {
      nationality: null,
      heightCM: null,
      weightKG: null,
      birthday: null,
      moustache: false,
      mullet: false,
      roundsCompleted: 0,
      roundsWon: 0,
      champsCompleted: 0,
      champsWon: 0,
      positionHistory: {},
      polePositions: 0,
      topThreeFinishes: 0,
      p10Finishes: 0,
      formScore: 0,
      dnfCount: 0,
      dnsCount: 0,
      consecutiveDNFs: 0,
    },
  }
}

// Initialize a new team with default values.
export const initTeam = (user: userType): teamType => {
  return {
    created_by: user._id,
    icon: "",
    emblem: "",
    name: "",
    series: [],
    drivers: [],
    stats: {
      inceptionDate: "",
      nationality: "",
    },
  }
}
