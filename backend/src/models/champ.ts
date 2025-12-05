import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

// Subdocument type for adjudicator round tracking
export interface AdjudicatorRound {
  season: number
  round: number
  timestamp: string
}

// Subdocument type for tracking bets per round
export interface Bet {
  competitor: ObjectId
  driver: ObjectId
  timestamp: string
}

export interface champType {
  _id: ObjectId
  name: string
  icon: string
  profile_picture: string
  season: number
  rounds: {
    round: number
    completed: boolean
    bets: Bet[]
  }[]
  standings: {
    competitor: ObjectId
    active: boolean
    status: "competitor" | "guest"
    results: {
      round: number
      points: number
    }[]
  }[]
  adjudicator: {
    current: ObjectId
    since: string
    rounds: AdjudicatorRound[]
    history: {
      adjudicator: ObjectId
      since: string
      rounds: AdjudicatorRound[]
    }[]
  }
  driverGroup: ObjectId
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
      history: {
        text: string
        updatedBy: ObjectId
        updated_at: string
      }[]
      subsections: {
        text: string
        created_by: ObjectId
        created_at: string
        history: {
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
    inviteOnly: boolean // only allow users to join via invite from adjudicator
    maxCompetitors: number // max competitors for a series to have at once
    inactiveCompetitors: boolean // competitors that are inactive
    protests: {
      // Active protests against other competitors
      protestsAlwaysVote: boolean
      allowMultipleProtests: boolean
    }
    ruleChanges: {
      // Active rule change proposals
      ruleChangeAlwaysVote: boolean
      allowMultipleRuleChanges: boolean
      ruleChangeExpiry: string
    }
    autoOpen: {
      // auto open betting window (Subject to availability on driverGroup)
      auto: boolean
      dateTime: string
    }
    autoClose: {
      // auto close betting window (Subject to availability on driverGroup)
      auto: boolean
      dateTime: string
    }
    audio: {
      // Play audio out of the same window for the champ (Adjudictor only)
      enabled: boolean
      auto: boolean // (Subject to availability on driverGroup)
      triggers: {
        open: string[]
        close: string[]
      }
    }
    wager: {
      // Allow a predetermined wager for the championship
      allow: boolean
      description: string
      max: number
      min: number
      equal: boolean
    }
  }
  champBadges: ObjectId[] // Badge model
  waitingList: {
    // If a championship is full, allow people to wait for an opening in this queue
    user: ObjectId
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
          competitor: ObjectId
          points: number
        }
        mostBadgesGiven: {
          competitor: ObjectId // Most badges given to a competitor.
          badgesNum: number
        }
        rarestBadgeGiven: {
          competitor: ObjectId // Rarest badge given to a competitor.
          badge: ObjectId // What badge?
        }
        mostWins: {
          competitor: ObjectId // Most wins ever.
          amount: number
        }
        mostRunnerUp: {
          competitor: ObjectId // Most runner up ever.
          amount: number
        }
        bestWinStreak: {
          competitor: ObjectId // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          competitor: ObjectId // The most times in a row a user has scored points.
          amount: number
        }
      }
      seasons: {
        season: number
        mostCompetitors: number // Most competitors to be a part of the champ concurrently.
        mostWins: {
          competitor: ObjectId // Most wins this season.
          amount: number
        }
        mostRunnerUp: {
          competitor: ObjectId // Most runner up this season.
          amount: number
        }
        bestWinStreak: {
          competitor: ObjectId // The most times in a row a user has won.
          amount: number
        }
        bestPointsStreak: {
          competitor: ObjectId // The most times in a row a user has scored points.
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

// Subdocument schema for adjudicator round tracking
const adjudicatorRoundSchema = new mongoose.Schema(
  {
    season: { type: Number, required: true },
    round: { type: Number, required: true },
    timestamp: { type: String, default: moment().format() },
  },
  { _id: false }
)

// Schema for tracking bets per round
const betSchema = new mongoose.Schema(
  {
    competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    driver: { type: mongoose.Schema.ObjectId, required: true, ref: "Driver" },
    timestamp: { type: String, default: moment().format() },
  },
  { _id: false }
)

const champSchema = new mongoose.Schema<champType>({
  name: { type: String, required: true }, // Name of the championship.
  icon: { type: String, default: "" }, // Icon of the champ.
  profile_picture: { type: String, default: "" }, // Profile picture/banner of the champ.
  season: { type: Number, required: true }, // The current season number.
  rounds: [
    {
      round: { type: Number, required: true },
      completed: { type: Boolean, default: false },
      bets: [betSchema], // Bets placed by competitors for this round.
    },
  ],
  standings: [
    {
      competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      active: { type: Boolean, default: true },
      status: { type: String, enum: ["competitor", "guest"], default: "competitor" },
      results: [
        {
          round: { type: Number, required: true },
          points: { type: Number, default: 0 },
        },
      ],
    },
  ],
  adjudicator: {
    // The adjudicator of the champ.
    current: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Current adjudicator.
    since: { type: String, default: moment().format() }, // How long as this user been the adjudicator?
    rounds: [adjudicatorRoundSchema], // Which rounds has this adjudicator completed (with season, round, timestamp)?
    history: [
      {
        // What's the history of adjudicators?
        adjudicator: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
        since: { type: String, default: moment().format() },
        rounds: [adjudicatorRoundSchema],
      },
    ],
  },
  driverGroup: { type: mongoose.Schema.ObjectId, required: true, ref: "DriverGroup" }, // The driver group/series this championship is based on.
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
        history: [
          {
            // Earlier iterations of this rule and what it used to look like.
            text: { type: String },
            updatedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
            updated_at: { type: String },
          },
        ],
        subsections: [
          {
            // Each subsection of this rule/reg. EG 4a, 4b...
            text: { type: String, required: true },
            created_by: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
            created_at: { type: String, default: moment().format() },
            history: [
              {
                text: { type: String },
                updatedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
                updated_at: { type: String },
              },
            ],
          },
        ],
      },
    ],
  },
  protests: [{ type: mongoose.Schema.ObjectId, ref: "Protest" }], // Open protests for this champ.
  ruleChanges: [{ type: mongoose.Schema.ObjectId, ref: "RuleChange" }], // Open votes for rule/reg changes.
  settings: {
    // Only allow users to join via invite from adjudicator.
    inviteOnly: { type: Boolean, default: false },
    // Maximum competitors in this championship. Default 24.
    // First-come-first-serve betting - no more than 1 competitor per car per round.
    maxCompetitors: { type: Number, default: 24 },
    // Allow marking competitors as inactive - they stay in champ with points intact,
    // greyed out, can't vote until marked active again. Frees space for others.
    inactiveCompetitors: { type: Boolean, default: false },
    protests: {
      // Do protests bypass adjudicator and go straight to voting?
      protestsAlwaysVote: { type: Boolean, default: false },
      // Allow multiple open protests at once?
      allowMultipleProtests: { type: Boolean, default: false },
    },
    ruleChanges: {
      // Do rule changes bypass adjudicator and go straight to voting?
      ruleChangeAlwaysVote: { type: Boolean, default: true },
      // Allow multiple open rule change votes at once?
      allowMultipleRuleChanges: { type: Boolean, default: true },
      // Timestamp when rule change vote times out (empty = no expiry).
      ruleChangeExpiry: { type: String, default: "" },
    },
    autoOpen: {
      // Auto-open betting window before qualifying session start.
      // Only available when driver group has live metadata from APIs.
      auto: { type: Boolean, default: false },
      dateTime: { type: String, default: "" },
    },
    autoClose: {
      // Auto-close betting window after qualifying session start.
      // Only available when driver group has live metadata from APIs.
      auto: { type: Boolean, default: false },
      dateTime: { type: String, default: "" },
    },
    audio: {
      // Allow adjudicator to upload audio samples played at specific times.
      enabled: { type: Boolean, default: false },
      // Auto-play requires live metadata (determined by driver group).
      auto: { type: Boolean, default: false },
      triggers: {
        open: [{ type: String }], // Audio triggers when betting opens.
        close: [{ type: String }], // Audio triggers when betting closes.
      },
    },
    wager: {
      // Enable wagering for this championship.
      allow: { type: Boolean, default: false },
      description: { type: String, default: "" },
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      // All competitors must wager equal amounts?
      equal: { type: Boolean, default: false },
    },
  },
  champBadges: [{ type: mongoose.Schema.ObjectId, ref: "Badge" }], // All badges that can be awarded by this champ.
  waitingList: [
    {
      // A waiting list of users that would like to join but the championship is at max capacity.
      user: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
      position: { type: Number, required: true }, // Current position in the queue.
    },
  ],
  history: {
    seasons: [{ type: Number }], // Array of started season numbers.
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
        mostCompetitors: { type: Number, default: 0 }, // Most competitors to be a part of the champ concurrently ever.
        mostPoints: {
          // Most points ever awarded to a competitor in a season.
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
          points: { type: Number, default: 0 },
        },
        mostBadgesGiven: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most badges given to a competitor.
          badgesNum: { type: Number, default: 0 },
        },
        rarestBadgeGiven: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Rarest badge given to a competitor.
          badge: { type: mongoose.Schema.ObjectId, required: true, ref: "Badge" }, // What badge?
        },
        mostWins: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most wins ever.
          amount: { type: Number, default: 0 },
        },
        mostRunnerUp: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most runner up ever.
          amount: { type: Number, default: 0 },
        },
        bestWinStreak: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has won.
          amount: { type: Number, default: 0 },
        },
        bestPointsStreak: {
          competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has scored points.
          amount: { type: Number, default: 0 },
        },
      },
      seasons: [
        {
          season: { type: Number, required: true }, // The season number.
          mostCompetitors: { type: Number, default: 0 }, // Most competitors to be a part of the champ concurrently.
          mostWins: {
            competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most wins this season.
            amount: { type: Number, default: 0 },
          },
          mostRunnerUp: {
            competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // Most runner up this season.
            amount: { type: Number, default: 0 },
          },
          bestWinStreak: {
            competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has won.
            amount: { type: Number, default: 0 },
          },
          bestPointsStreak: {
            competitor: { type: mongoose.Schema.ObjectId, required: true, ref: "User" }, // The most times in a row a user has scored points.
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
