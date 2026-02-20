import { NavigateFunction } from "react-router-dom"

// User's embedded championship snapshot. Persists even if the original Championship is deleted.
// Updated after each round for active champs, preserved when champ is deleted.
export interface userChampSnapshotType {
  _id: string
  name: string
  icon: string
  season: number
  position: number
  positionChange: number | null
  totalPoints: number
  lastPoints: number
  roundsCompleted: number
  totalRounds: number
  competitorCount: number
  maxCompetitors: number
  discoveredBadges: number
  totalBadges: number
  deleted: boolean
  updated_at: string
}

// User's embedded badge snapshot. Persists even if the original Badge is deleted.
// featured: Slot position (1-6) for profile display, or null if not featured.
export interface userBadgeSnapshotType {
  _id: string
  championship: string
  url: string | null
  name: string | null
  customName?: string | null
  rarity: number
  awardedHow: string | null
  awardedDesc: string | null
  zoom: number
  awarded_at: string
  featured?: number | null
}

// Notification types for different events.
export type NotificationTypeEnum =
  | "champ_invite"
  | "badge_earned"
  | "round_started"
  | "results_posted"
  | "kicked"
  | "banned"
  | "promoted"
  | "user_joined"
  | "protest_filed"
  | "protest_vote_required"
  | "protest_passed"
  | "protest_denied"
  | "protest_expired"

// Protest status for notification display.
export type NotificationProtestStatus = "adjudicating" | "voting" | "denied" | "passed"

// Notification object stored in user's notifications array.
export interface NotificationType {
  _id: string
  type: NotificationTypeEnum
  title: string
  description: string
  read: boolean
  // Optional championship reference for deep linking.
  champId?: string
  champName?: string
  champIcon?: string
  // Optional badge snapshot for badge earned notifications.
  badgeSnapshot?: userBadgeSnapshotType
  // Optional protest data for protest notifications.
  protestId?: string
  protestTitle?: string
  filerId?: string
  filerName?: string
  filerIcon?: string
  accusedId?: string
  accusedName?: string
  accusedIcon?: string
  filerPoints?: number
  accusedPoints?: number
  protestStatus?: NotificationProtestStatus
  createdAt: string
}

// User's social event privacy preferences.
export interface SocialEventSettingsType {
  badge_earned_epic: boolean
  badge_earned_legendary: boolean
  badge_earned_mythic: boolean
  champ_joined: boolean
  champ_created: boolean
  season_won: boolean
  season_runner_up: boolean
  round_won: boolean
  round_perfect_bet: boolean
  win_streak: boolean
  points_milestone: boolean
  rounds_milestone: boolean
  user_joined_platform: boolean
  adjudicator_promoted: boolean
}

// User location for geo-based feed ranking.
export interface UserLocationType {
  city?: string
  region?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

// User's email notification preferences.
export interface NotificationSettingsType {
  emailChampInvite: boolean
  emailBadgeEarned: boolean
  emailRoundStarted: boolean
  emailResultsPosted: boolean
  emailKicked: boolean
  emailBanned: boolean
  emailPromoted: boolean
  emailUserJoined: boolean
  emailProtestFiled: boolean
  emailProtestVoteRequired: boolean
  emailProtestPassed: boolean
  emailProtestDenied: boolean
  emailProtestExpired: boolean
}

export interface userType {
  _id: string
  token: string
  name: string
  email: string
  icon: string
  profile_picture: string
  championships: userChampSnapshotType[]
  badges: userBadgeSnapshotType[]
  notifications: NotificationType[]
  notificationsCount: number
  notificationSettings: NotificationSettingsType
  following: string[]
  socialEventSettings: SocialEventSettingsType
  location?: UserLocationType
  created_at: string
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
    [key: string]: string | boolean
  }
  localStorage: boolean
  tokens?: string[]
}

// Default notification settings (all enabled).
const defaultNotificationSettings: NotificationSettingsType = {
  emailChampInvite: true,
  emailBadgeEarned: true,
  emailRoundStarted: true,
  emailResultsPosted: true,
  emailKicked: true,
  emailBanned: true,
  emailPromoted: true,
  emailUserJoined: true,
  emailProtestFiled: true,
  emailProtestVoteRequired: true,
  emailProtestPassed: true,
  emailProtestDenied: true,
  emailProtestExpired: true,
}

// Default social event settings.
const defaultSocialEventSettings: SocialEventSettingsType = {
  badge_earned_epic: true,
  badge_earned_legendary: true,
  badge_earned_mythic: true,
  champ_joined: true,
  champ_created: true,
  season_won: true,
  season_runner_up: true,
  round_won: true,
  round_perfect_bet: false,
  win_streak: true,
  points_milestone: true,
  rounds_milestone: false,
  user_joined_platform: true,
  adjudicator_promoted: true,
}

// A user object template with falsy values.
const blankUser = {
  _id: "",
  token: "",
  name: "",
  email: "",
  icon: "",
  profile_picture: "",
  championships: [],
  badges: [],
  notifications: [],
  notificationsCount: 0,
  notificationSettings: defaultNotificationSettings,
  following: [],
  socialEventSettings: defaultSocialEventSettings,
  created_at: "",
  permissions: {
    admin: false,
    adjudicator: false,
    guest: false,
  },
  localStorage: false,
}

// If there are tokens in local storage, retrieve user object.
// Otherwise, call logout.
export const checkUserLS = (): userType => {
  const token = localStorage.getItem("access_token") || ""
  const refreshToken = localStorage.getItem("refresh_token") || ""

  if (!token && !refreshToken) {
    return logout()
  } else {
    const _id = localStorage.getItem("_id")
    const name = localStorage.getItem("name")
    const email = localStorage.getItem("email")
    const icon = localStorage.getItem("icon")
    const profile_picture = localStorage.getItem("profile_picture")
    const championships = localStorage.getItem("championships")
    const badges = localStorage.getItem("badges")
    const notifications = localStorage.getItem("notifications")
    const notificationsCount = localStorage.getItem("notificationsCount")
    const notificationSettings = localStorage.getItem("notificationSettings")
    const following = localStorage.getItem("following")
    const socialEventSettings = localStorage.getItem("socialEventSettings")
    const created_at = localStorage.getItem("created_at")
    const permissions = localStorage.getItem("permissions")

    const user: userType = {
      token,
      _id: _id ? _id : "",
      name: name ? name : "",
      email: email ? email : "",
      icon: icon ? icon : "",
      profile_picture: profile_picture ? profile_picture : "",
      championships: championships ? JSON.parse(championships) : blankUser.championships,
      badges: badges ? JSON.parse(badges) : blankUser.badges,
      notifications: notifications ? JSON.parse(notifications) : blankUser.notifications,
      notificationsCount: notificationsCount ? parseInt(notificationsCount, 10) : 0,
      notificationSettings: notificationSettings ? JSON.parse(notificationSettings) : blankUser.notificationSettings,
      following: following ? JSON.parse(following) : blankUser.following,
      socialEventSettings: socialEventSettings ? JSON.parse(socialEventSettings) : blankUser.socialEventSettings,
      created_at: created_at ? created_at : blankUser.created_at,
      permissions: permissions ? JSON.parse(permissions) : blankUser.permissions,
      localStorage: true,
    }

    return user
  }
}

// Log the user out removing all local storage and return a blank user object.
// If the navigate function is passed, navigate to /login.
export const logout = (
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  navigate?: NavigateFunction,
): userType => {
  localStorage.removeItem("_id")
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")
  localStorage.removeItem("icon")
  localStorage.removeItem("profile_picture")
  localStorage.removeItem("championships")
  localStorage.removeItem("badges")
  localStorage.removeItem("notifications")
  localStorage.removeItem("notificationsCount")
  localStorage.removeItem("notificationSettings")
  localStorage.removeItem("following")
  localStorage.removeItem("socialEventSettings")
  localStorage.removeItem("created_at")
  localStorage.removeItem("permissions")

  if (setUser) {
    setUser((prevUser) => {
      return {
        ...prevUser,
        ...blankUser,
      }
    })
  }

  if (navigate) navigate("/login")

  return blankUser
}

// Populate local storage and return the populated user object.
export const logInSuccess = (
  request: string,
  res: {
    data: {
      data: {
        [key: string]: userType
      }
    }
  },
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  log?: boolean,
): userType => {
  const user = res.data.data[request]

  if (user.tokens) {
    user.token = tokensHandler(user, user.tokens)
  }

  if (!user.localStorage) {
    localStorage.setItem("_id", user._id)
    localStorage.setItem("name", user.name)
    localStorage.setItem("email", user.email)
    localStorage.setItem("icon", user.icon)
    localStorage.setItem("profile_picture", user.profile_picture)
    localStorage.setItem("championships", JSON.stringify(user.championships))
    localStorage.setItem("badges", JSON.stringify(user.badges))
    localStorage.setItem("notificationsCount", String(user.notificationsCount || 0))
    localStorage.setItem("notificationSettings", JSON.stringify(user.notificationSettings || defaultNotificationSettings))
    localStorage.setItem("following", JSON.stringify(user.following || []))
    localStorage.setItem("socialEventSettings", JSON.stringify(user.socialEventSettings || defaultSocialEventSettings))
    localStorage.setItem("created_at", user.created_at)
    localStorage.setItem("permissions", JSON.stringify(user.permissions))
  }

  if (setUser) {
    setUser((prevUser) => {
      return {
        ...prevUser,
        ...user,
      }
    })
  }

  if (log) {
    console.log(user)
  }

  return user
}

//
export const tokensHandler = (
  user: userType,
  tokens?: string[],
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
): string => {
  if (!Array.isArray(tokens) || !tokens.length) {
    return user.token
  } else {
    if (setUser) {
      setUser((prevUser) => {
        return {
          ...prevUser,
          token: tokens[0],
        }
      })
    }

    localStorage.setItem("access_token", tokens[0])
    localStorage.setItem("refresh_token", tokens[1])

    return tokens[0]
  }
}
