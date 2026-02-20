import { SocialEventKind } from "../../../../shared/socialTypes"
import { SocialEventConfig } from "./types"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech"
import GroupAddIcon from "@mui/icons-material/GroupAdd"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import WhatshotIcon from "@mui/icons-material/Whatshot"
import StarIcon from "@mui/icons-material/Star"
import FlagIcon from "@mui/icons-material/Flag"
import GavelIcon from "@mui/icons-material/Gavel"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import SportsScoreIcon from "@mui/icons-material/SportsScore"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import RouteIcon from "@mui/icons-material/Route"

const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]

// Registry mapping each social event kind to its display configuration.
const eventConfigs: Record<SocialEventKind, SocialEventConfig> = {
  badge_earned: {
    title: "Badge Win",
    getTitle: (payload) => {
      const rarityName = RARITY_NAMES[payload.badgeRarity ?? 0] ?? "Common"
      return `${rarityName} Badge Win`
    },
    Icon: WorkspacePremiumIcon,
    iconColor: "#3080d0",
    getText: (name, payload) => `${name} earned the ${payload.badgeName} badge`,
    layout: "badge",
  },
  champ_joined: {
    title: "Championship Joined",
    Icon: GroupAddIcon,
    iconColor: "#1976d2",
    getText: (name, payload) => `${name} joined ${payload.champName}`,
    contentStyle: { borderSide: "left", borderColor: "#1976d2" },
    layout: "default",
    useChampIcon: true,
  },
  champ_created: {
    title: "Championship Created",
    Icon: AddCircleIcon,
    iconColor: "#1976d2",
    getText: (name, payload) => `${name} created ${payload.champName}`,
    contentStyle: { borderSide: "left", borderColor: "#1976d2" },
    layout: "default",
    useChampIcon: true,
  },
  season_won: {
    title: "Season Champion",
    Icon: EmojiEventsIcon,
    iconColor: "#FFD700",
    getText: (name, payload) => `${name} won ${payload.champName} Season ${payload.season}`,
    layout: "champion",
    showcase: {
      getHeroText: (payload) => `Season ${payload.season}`,
      getSubtitle: (payload) => payload.champName,
    },
  },
  season_runner_up: {
    title: "Season Runner-Up",
    Icon: MilitaryTechIcon,
    iconColor: "#C0C0C0",
    getText: (name, payload) => `${name} finished runner-up in ${payload.champName} Season ${payload.season}`,
    layout: "runner-up",
    showcase: {
      getHeroText: (payload) => `Season ${payload.season}`,
      getSubtitle: (payload) => payload.champName,
    },
  },
  round_won: {
    title: "Round Victory",
    Icon: FlagIcon,
    iconColor: "#4caf50",
    getText: (name, payload) => `${name} won Round ${payload.roundNumber} of ${payload.champName}`,
    layout: "victory",
    showcase: {
      getHeroText: (payload) => `Round ${payload.roundNumber}`,
      getSubtitle: (payload) => payload.champName,
    },
  },
  round_perfect_bet: {
    title: "Perfect Bet",
    Icon: SportsScoreIcon,
    iconColor: "#E10600",
    getText: (name, payload) => `${name} bet on the exact P10 driver in Round ${payload.roundNumber}`,
    layout: "perfect",
    showcase: {
      getHeroText: (payload) => `Round ${payload.roundNumber}`,
      getSubtitle: () => "Exact P10 prediction",
    },
  },
  win_streak: {
    title: "Win Streak",
    Icon: WhatshotIcon,
    iconColor: "#E8860C",
    getText: (name, payload) => `${name} is on a ${payload.streakCount}-round win streak in ${payload.champName}`,
    layout: "streak",
    showcase: {
      getHeroText: (payload) => `${payload.streakCount}-Round Streak`,
      getSubtitle: (payload) => payload.champName,
    },
  },
  points_milestone: {
    title: "Points Milestone",
    Icon: StarIcon,
    iconColor: "#fdd835",
    getText: (name, payload) => `${name} reached ${payload.milestoneValue} points in ${payload.champName}`,
    contentStyle: { borderSide: "left", borderColor: "#fdd835" },
    layout: "default",
  },
  rounds_milestone: {
    title: "Rounds Milestone",
    Icon: RouteIcon,
    iconColor: "#fdd835",
    getText: (name, payload) => `${name} completed ${payload.milestoneValue} rounds`,
    contentStyle: { borderSide: "left", borderColor: "#fdd835" },
    layout: "default",
  },
  user_joined_platform: {
    title: "New Competitor",
    Icon: PersonAddIcon,
    iconColor: "#1976d2",
    getText: (name) => `${name} joined P10`,
    contentStyle: {
      borderSide: "left",
      borderColor: "#1976d2",
      background: "linear-gradient(135deg, rgba(25, 118, 210, 0.03) 0%, white 100%)",
    },
    layout: "default",
  },
  adjudicator_promoted: {
    title: "Adjudicator Promotion",
    Icon: GavelIcon,
    iconColor: "#6A5ACD",
    getText: (name, payload) => `${name} was promoted to adjudicator in ${payload.champName}`,
    contentStyle: {
      borderSide: "left",
      borderColor: "#6A5ACD",
      background: "linear-gradient(135deg, rgba(106, 90, 205, 0.03) 0%, white 100%)",
    },
    layout: "default",
  },
}

// Resolves the config for a given social event kind.
export const getEventConfig = (kind: SocialEventKind): SocialEventConfig => eventConfigs[kind]
