// Literal union of all social event kinds.
export type SocialEventKind =
  | "badge_earned"
  | "champ_joined"
  | "champ_created"
  | "season_won"
  | "season_runner_up"
  | "round_won"
  | "round_perfect_bet"
  | "win_streak"
  | "points_milestone"
  | "rounds_milestone"
  | "user_joined_platform"
  | "adjudicator_promoted"

// Flexible payload that varies by event kind.
export interface SocialEventPayload {
  badgeName?: string
  badgeUrl?: string
  badgeRarity?: number
  badgeAwardedHow?: string
  champId?: string
  champName?: string
  champIcon?: string
  season?: number
  roundNumber?: number
  driverName?: string
  pointsEarned?: number
  streakCount?: number
  milestoneValue?: number
  milestoneLabel?: string
}

// Denormalized user snapshot for fast feed rendering.
export interface UserSnapshot {
  name: string
  icon: string
}

// A social event displayed in the home feed.
export interface SocialEventType {
  _id: string
  kind: SocialEventKind
  user: string
  userSnapshot: UserSnapshot
  payload: SocialEventPayload
  commentCount: number
  created_at: string
}

// Lightweight championship snapshot for the following detail view.
export interface ChampSnapshotType {
  _id: string
  name: string
  icon: string
  updated_at?: string
}

// A followed user with championship and location data for sorted display.
export interface FollowingDetailedUser {
  _id: string
  name: string
  icon: string
  championships: ChampSnapshotType[]
  location?: { country?: string }
}

// A comment on a social event.
export interface SocialCommentType {
  _id: string
  event: string
  user: string
  userSnapshot: UserSnapshot
  text: string
  likes: string[]
  dislikes: string[]
  likesCount: number
  dislikesCount: number
  created_at: string
}
