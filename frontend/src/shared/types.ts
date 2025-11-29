import { userType } from "./localStorage"

export interface formType {
  icon: File | null
  profile_picture: File | null
  name?: string
  champName?: string
  email?: string
}

export interface formErrType {
  name?: string
  champName?: string
  dropzone: string
  [key: string]: string | undefined | number
}

export type pointsStructureType = {
  result: number
  points: number
}[]

export type ruleOrRegType = {
  text: string
  created_by: userType
  created_at: string
  histroy: {
    text: string
    updatedBy: userType
    updated_at: string
  }[]
  subsections?: ruleOrRegType[]
}

export type rulesAndRegsListType = ruleOrRegType[]

export type rulesAndRegsType = {
  default: boolean
  list: rulesAndRegsListType
}

export interface badgeType {
  _id?: string
  championship?: champType
  url: string
  name: string
  rarity: number
  awardedTo?: userType[]
  awardedHow: string
  awardedDesc: string
  zoom: number
  created_at?: string
  updated_at?: string
  file?: File | null
  default?: boolean
}

export interface teamType {
  _id?: string
  url: string
  name: string
  driverGroups: driverGroupType[]
  drivers: driverType[]
  stats: {
    inceptionDate: string
    nationality: string
  }
  created_by?: userType | string
  created_at?: string
  updated_at?: string
  tokens?: string[]
  _doc?: teamType
}

export interface driverType {
  _id?: string
  url: string
  name: string
  driverID: `${Uppercase<string>}${Uppercase<string>}${Uppercase<string>}` | ""
  teams: teamType[]
  driverGroups: driverGroupType[]
  stats: {
    nationality: string | null
    heightCM: number | null
    weightKG: number | null
    birthday: string | null
    moustache: boolean
    mullet: boolean
  }
  created_by?: userType | string
  created_at?: string
  updated_at?: string
}

export interface driverGroupType {
  _id?: string
  url: string
  name: string
  championships: champType[]
  drivers: driverType[]
  created_by?: userType | string
  created_at?: string
  updated_at?: string
  tokens?: string[]
}

export interface champType {
  _id: string
  name: string
  icon: string
  season: string
  rounds: {
    round: number
    completed: boolean
    standings: {
      player: userType
      points: number
      history: {
        round: string
        points: number
      }[]
    }[]
  }[]
  adjudicator: {
    current: userType
    since: string
    rounds: string[]
    player: boolean
    history: {
      adjudicator: userType
      since: string
      rounds: string[]
    }[]
  }
  players: userType[]
  driverGroup: driverGroupType
  pointsStructure: pointsStructureType
  rulesAndRegs: rulesAndRegsType
  protests: protestType[] // Protest model
  ruleChanges: ruleChangeType[] // RuleChange model
  settings: {
    maxPlayers: number
    inactivePlayers: boolean
    protests: {
      protestsAlwaysVote: boolean
      allowMultipleProtests: boolean
    }
    ruleChanges: {
      ruleChangeAlwaysVote: boolean
      allowMultipleRuleChanges: boolean
      ruleChangeExpiry: string
    }
    autoOpen: {
      auto: boolean
      dateTime: string
    }
    autoClose: {
      auto: boolean
      dateTime: string
    }
    audio: {
      enabled: boolean
      auto: boolean
      triggers: {
        open: string[]
        close: string[]
      }
    }
    wager: {
      allow: boolean
      description: string
      max: number
      min: number
      equal: boolean
    }
  }
  champBadges: badgeType[] // Badge model
  waitingList: {
    user: userType
    position: number
  }[]
  history: {
    seasons: string[]
    names: {
      name: string
      created_at: string
    }[]
    rounds: {
      round: string
      created_at: string
    }[]
    stats: {
      allTime: {
        mostPlayers: number // Most players to be a part of the champ concurrently ever.
        mostPoints: {
          // Most points ever awarded to a player in a season.
          player: userType
          points: number
        }
        mostBadgesGiven: {
          player: userType // Most badges given to a player.
          badgesNum: number
        }
        rarestBadgeGiven: {
          player: userType // Rarest badge given to a player.
          badge: userType // What badge?
        }
        mostWins: {
          player: userType // Most wins ever.
          amount: number
        }
        mostRunnerUp: {
          player: userType // Most runner up ever.
          amount: number
        }
        bestWinStreak: {
          player: userType // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          player: userType // The most times in a row a user has scorred points.
          amount: number
        }
      }
      seasons: {
        season: string
        mostPlayers: number // Most players to be a part of the champ concurrently.
        mostWins: {
          player: userType // Most wins this season.
          amount: number
        }
        mostRunnerUp: {
          player: userType // Most runner up this season.
          amount: number
        }
        bestWinStreak: {
          player: userType // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          player: userType // The most times in a row a user has scorred points.
          amount: number
        }
      }[]
    }
  }
  created_by?: userType | string
  created_at: string
  updated_at: string
  tokens: string
}

export interface protestType {
  _id: string
  championship: champType
  title: string
  description: string
  vote: boolean
  voteArr: {
    user: userType
    approve: boolean
  }[]
  created_by?: userType | string
  created_at: string
  updated_at: string
  tokens: string
}

export interface ruleChangeType {
  _id: string
  championship: champType
  title: string
  description: string
  vote: boolean
  voteArr: {
    user: userType
    approve: boolean
  }[]
  voteExipiry: string
  created_by?: userType | string
  created_at: string
  updated_at: string
  tokens: string
}
