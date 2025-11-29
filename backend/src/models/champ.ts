import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface champType {
  _id: ObjectId
  name: string
  icon: string
  season: string
  rounds: {
    round: number
    completed: boolean
    standings: {
      player: ObjectId
      points: number
      history: {
        round: string
        points: number
      }[]
    }[]
  }[]
  adjudicator: {
    current: ObjectId
    since: string
    rounds: string[]
    player: boolean
    history: {
      adjudicator: ObjectId
      since: string
      rounds: string[]
    }[]
  }
  players: ObjectId[]
  driverGroup: ObjectId[]
  pointsStructure: {
    result: number
    points: number
  }[]
  rulesAndRegs: {
    default: boolean
    list: {
      text: string
      created_by: ObjectId
      created_at: string
      histroy: {
        text: string
        updatedBy: ObjectId
        updated_at: string
      }[]
      subsections: {
        text: string
        created_by: ObjectId
        created_at: string
        histroy: {
          text: string
          updatedBy: ObjectId
          updated_at: string
        }[]
      }[]
    }[]
  }
  protests: ObjectId[] // Protest model
  ruleChanges: ObjectId[] // RuleChange model
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
  champBadges: ObjectId[] // Badge model
  waitingList: {
    user: ObjectId
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
          player: ObjectId
          points: number
        }
        mostBadgesGiven: {
          player: ObjectId // Most badges given to a player.
          badgesNum: number
        }
        rarestBadgeGiven: {
          player: ObjectId // Rarest badge given to a player.
          badge: ObjectId // What badge?
        }
        mostWins: {
          player: ObjectId // Most wins ever.
          amount: number
        }
        mostRunnerUp: {
          player: ObjectId // Most runner up ever.
          amount: number
        }
        bestWinStreak: {
          player: ObjectId // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          player: ObjectId // The most times in a row a user has scorred points.
          amount: number
        }
      }
      seasons: {
        season: string
        mostPlayers: number // Most players to be a part of the champ concurrently.
        mostWins: {
          player: ObjectId // Most wins this season.
          amount: number
        }
        mostRunnerUp: {
          player: ObjectId // Most runner up this season.
          amount: number
        }
        bestWinStreak: {
          player: ObjectId // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          player: ObjectId // The most times in a row a user has scorred points.
          amount: number
        }
      }[]
    }
  }
  created_by: ObjectId
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: champType
}

const champSchema = new mongoose.Schema<champType>({
  name: { type: String, required: true }, // Name of the championship.
  icon: { type: String, default: "" }, // Icon of the champ.
  season: { type: String, required: true }, // The name of the current season.
  rounds: {
    round: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    standings: [
      // An array of all the users and their current standings.
      {
        player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
        points: { type: Number, required: true },
        history: [
          {
            // The amount of points this user had in previous rounds.
            round: { type: String, required: true },
            points: { type: Number, required: true },
          },
        ],
      },
    ],
  },
  adjudicator: {
    // The adjudicator of the champ.
    current: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Current adjudicator.
    since: { type: String, default: moment().format() }, // How long as this user been the adjudicator?
    rounds: [{ type: String }], // For which rounds has this person been the adjudicator?
    player: { type: Boolean, default: true }, // The adjudicator is a player as well?
    history: [
      {
        // What's the history of adjudicators?
        adjudicator: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
        since: { type: String, default: moment().format() },
        rounds: [{ type: String }],
      },
    ],
  },
  players: [{ type: mongoose.Schema.ObjectId, required: true, ref: "User" }], // Current Players taking part in the champ.
  pointsStructure: [
    {
      // How many points are awarded for what results?
      result: { type: Number, required: true }, // Result of a round of betting.
      points: { type: Number, required: true }, // Amount rewarded for result.
    },
  ],
  rulesAndRegs: {
    // An array of rules and regulations for this champ.
    default: { type: Boolean, default: true }, // Use a default set of rules and regs instead of custom.
    list: [
      {
        text: { type: String, required: true }, // What is the rule/reg?
        created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Who created this rule?
        created_at: { type: String, default: moment().format() }, // When was this rule created?
        histroy: {
          // Earlier iterations of this rule and what it used to look like.
          text: { type: String, required: true },
          updatedBy: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
          updated_at: { type: String, default: moment().format() },
        },
        subsections: [
          {
            // Each subsection of this rule/reg. EG 4a, 4b...
            text: { type: String, required: true },
            created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
            created_at: { type: String, default: moment().format() },
            histroy: {
              text: { type: String, required: true },
              updatedBy: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
              updated_at: { type: String, default: moment().format() },
            },
          },
        ],
      },
    ],
  },
  protests: [{ type: mongoose.Schema.ObjectId, ref: "Protest" }], // Open protests for this champ.
  ruleChanges: [{ type: mongoose.Schema.ObjectId, ref: "RuleChange" }], // Open votes for rule/reg changes.
  settings: {
    // General settings for this champ.
    maxPlayers: { type: Number, default: 0 }, // Maximum amount of players that can compete.
    inactivePlayers: { type: Boolean, default: true }, // Include players that have taken part this season but are no longer in the champ.
    protests: {
      protestsAlwaysVote: { type: Boolean, default: false }, // Default to always start the vote process when a protest is issued.
      allowMultipleProtests: { type: Boolean, default: false }, // Allow a single user to submit more than one protest at a time.
    },
    ruleChange: {
      ruleChangeAlwaysVote: { type: Boolean, default: true }, // Default to always start the vote process when a rule change is issued.
      allowMultipleRuleChanges: { type: Boolean, default: true }, // Allow more that one rule change vote to be open at a time.
      ruleChangeExpiry: { type: String, default: "M" }, // Amount of time before rule change votes expire for this champ. String is to be passed to momentjs.
    },
    autoOpen: {
      // Automatically open the betting window.
      auto: { type: Boolean, default: false },
      dateTime: { type: String, required: true },
    },
    autoClose: {
      // Automatically close the betting window.
      auto: { type: Boolean, default: false },
      dateTime: { type: String, required: true },
    },
    audio: {
      // Play fun audio samples in browser to notify of events.
      enabled: { type: Boolean, default: false }, // Audio is enabled in the browser.
      auto: { type: Boolean, default: false }, // Automatically play audio samples.
      triggers: {
        // What events triggure audio?
        open: [{ type: String }], // When betting window opens.
        close: [{ type: String }], // When betting window closes.
      },
    },
    wager: {
      allow: { type: Boolean, default: false }, // Allow users to wager the outcome of the champ. Winner takes all.
      description: { type: String, default: "" }, // Description of the wager.
      max: { type: Number }, // What's the maximum amount a user can wager?
      min: { type: Number }, // What's the minimum amount a user can wager?
      equal: { type: Boolean, default: false }, // Does the wager from every user have to be equal?
    },
  },
  champBadges: [{ type: mongoose.Schema.ObjectId, ref: "Badge" }], // All badges that can be awarded by this champ.
  waitingList: [
    {
      // A waiting list of users that would like to join but the amount of current players is equal to maxPlayers.
      user: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      position: { type: Number, required: true }, // Current poition in the queue.
    },
  ],
  history: {
    seasons: [{ type: String }], // Array of started seasons.
    names: [
      {
        // Array of previous names of the champ.
        name: { type: String, required: true },
        created_at: { type: String, default: moment().format() },
      },
    ],
    rounds: [
      {
        // Array of started rounds of the champ.
        round: { type: String, required: true },
        created_at: { type: String, default: moment().format() },
      },
    ],
    stats: {
      allTime: {
        mostPlayers: { type: Number, default: 0 }, // Most players to be a part of the champ concurrently ever.
        mostPoints: {
          // Most points ever awarded to a player in a season.
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
          points: { type: Number, default: 0 },
        },
        mostBadgesGiven: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most badges given to a player.
          badgesNum: { type: Number, default: 0 },
        },
        rarestBadgeGiven: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Rarest badge given to a player.
          badge: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // What badge?
        },
        mostWins: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most wins ever.
          amount: { type: Number, default: 0 },
        },
        mostRunnerUp: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most runner up ever.
          amount: { type: Number, default: 0 },
        },
        bestWinStreak: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has won.
          amount: { type: Number, default: 0 },
        },
        bestPointsStreak: {
          player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has scorred points.
          amount: { type: Number, default: 0 },
        },
      },
      seasons: [
        {
          season: { type: String, required: true }, // The name of each season.
          mostPlayers: { type: Number, default: 0 }, // Most players to be a part of the champ concurrently.
          mostWins: {
            player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most wins this season.
            amount: { type: Number, default: 0 },
          },
          mostRunnerUp: {
            player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most runner up this season.
            amount: { type: Number, default: 0 },
          },
          bestWinStreak: {
            player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has won.
            amount: { type: Number, default: 0 },
          },
          bestPointsStreak: {
            player: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has scorred points.
            amount: { type: Number, default: 0 },
          },
        },
      ],
    },
  },
  created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // User that created the Championship.
  created_at: { type: String, default: moment().format() }, // When the champ was created.
  updated_at: { type: String, default: moment().format() }, // When champ settings were changed.
})

const Champ = mongoose.model<champType>("Champ", champSchema)

export default Champ
