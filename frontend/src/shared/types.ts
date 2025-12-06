import { userType } from "./localStorage"

// Type for viewing another user's profile (populated data).
export interface userProfileType {
  _id: string
  name: string
  icon: string
  profile_picture: string
  championships: champType[]
  badges: badgeType[]
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
  }
  created_at: string
}

export interface formType {
  icon: File | null
  profile_picture: File | null
  bodyIcon?: File | null
  bodyPicture?: File | null
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
  history: {
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
  body: string
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

// Type for tracking adjudicator rounds
export interface AdjudicatorRoundType {
  season: number
  round: number
  timestamp: string
}

// Type for tracking bets per round
export interface BetType {
  competitor: userType | string
  driver: driverType | string
  timestamp: string
}

export interface champType {
  _id: string
  name: string
  icon: string
  profile_picture: string
  season: number
  rounds: {
    round: number
    completed: boolean
    bets: BetType[]
  }[]
  standings: {
    competitor: userType
    active: boolean
    status: "competitor" | "guest"
    results: {
      round: number
      points: number
    }[]
  }[]
  adjudicator: {
    current: userType
    since: string
    rounds: AdjudicatorRoundType[]
    history: {
      adjudicator: userType
      since: string
      rounds: AdjudicatorRoundType[]
    }[]
  }
  driverGroup: driverGroupType
  pointsStructure: pointsStructureType
  rulesAndRegs: rulesAndRegsType
  protests: protestType[] // Protest model
  ruleChanges: ruleChangeType[] // RuleChange model
  settings: {
    inviteOnly: boolean
    maxCompetitors: number
    inactiveCompetitors: boolean
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
    seasons: number[]
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
        mostCompetitors: number // Most competitors to be a part of the champ concurrently ever.
        mostPoints: {
          // Most points ever awarded to a competitor in a season.
          competitor: userType
          points: number
        }
        mostBadgesGiven: {
          competitor: userType // Most badges given to a competitor.
          badgesNum: number
        }
        rarestBadgeGiven: {
          competitor: userType // Rarest badge given to a competitor.
          badge: userType // What badge?
        }
        mostWins: {
          competitor: userType // Most wins ever.
          amount: number
        }
        mostRunnerUp: {
          competitor: userType // Most runner up ever.
          amount: number
        }
        bestWinStreak: {
          competitor: userType // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          competitor: userType // The most times in a row a user has scored points.
          amount: number
        }
      }
      seasons: {
        season: number
        mostCompetitors: number // Most competitors to be a part of the champ concurrently.
        mostWins: {
          competitor: userType // Most wins this season.
          amount: number
        }
        mostRunnerUp: {
          competitor: userType // Most runner up this season.
          amount: number
        }
        bestWinStreak: {
          competitor: userType // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          competitor: userType // The most times in a row a user has scored points.
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
