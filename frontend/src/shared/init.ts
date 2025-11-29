import { userType } from "./localStorage"
import { driverGroupType, driverType, teamType } from "./types"

export const initDriverGroup = (user: userType): driverGroupType => {
  return {
    created_by: user._id,
    url: "",
    name: "",
    championships: [],
    drivers: [],
  }
}

export const initDriver = (user: userType): driverType => {
  return {
    created_by: user._id,
    url: "",
    name: "",
    driverID: "",
    teams: [],
    driverGroups: [],
    stats: {
      nationality: null,
      heightCM: null,
      weightKG: null,
      birthday: null,
      moustache: false,
      mullet: false,
    },
  }
}

export const initTeam = (user: userType): teamType => {
  return {
    created_by: user._id,
    url: "",
    name: "",
    driverGroups: [],
    drivers: [],
    stats: {
      inceptionDate: "",
      nationality: "",
    },
  }
}
