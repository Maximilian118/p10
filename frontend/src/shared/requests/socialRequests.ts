import axios from "axios"
import { userType, tokensHandler, SocialEventSettingsType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { SocialEventType, SocialCommentType, FollowingDetailedUser } from "../socialTypes"
import { populateUser } from "./requestPopulation"

// Fetch paginated social feed for the authenticated user.
export const getFeed = async (
  cursor: string | null,
  limit: number,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<{ events: SocialEventType[]; nextCursor: string | null } | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { cursor, limit },
        query: `
          query GetFeed($cursor: String, $limit: Int) {
            getFeed(cursor: $cursor, limit: $limit) {
              events {
                _id
                kind
                user
                userSnapshot { name icon }
                payload {
                  badgeName badgeUrl badgeRarity badgeAwardedHow
                  champId champName champIcon season
                  roundNumber driverName pointsEarned
                  streakCount milestoneValue milestoneLabel
                }
                commentCount
                created_at
              }
              nextCursor
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("getFeed", res, setUser, navigate, setBackendErr, true)
      return null
    }

    const data = res.data.data.getFeed
    tokensHandler(user, data.tokens, setUser)

    return {
      events: data.events,
      nextCursor: data.nextCursor,
    }
  } catch (err: unknown) {
    graphQLErrors("getFeed", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Fetch paginated comments for a social event.
export const getComments = async (
  eventId: string,
  cursor: string | null,
  limit: number,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<{ comments: SocialCommentType[]; nextCursor: string | null } | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { eventId, cursor, limit },
        query: `
          query GetComments($eventId: ID!, $cursor: String, $limit: Int) {
            getComments(eventId: $eventId, cursor: $cursor, limit: $limit) {
              comments {
                _id
                event
                user
                userSnapshot { name icon }
                text
                likes
                dislikes
                likesCount
                dislikesCount
                created_at
              }
              nextCursor
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("getComments", res, setUser, navigate, setBackendErr, true)
      return null
    }

    const data = res.data.data.getComments
    tokensHandler(user, data.tokens, setUser)

    return {
      comments: data.comments,
      nextCursor: data.nextCursor,
    }
  } catch (err: unknown) {
    graphQLErrors("getComments", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Add a comment to a social event.
export const addComment = async (
  eventId: string,
  text: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<SocialCommentType | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { eventId, text },
        query: `
          mutation AddComment($eventId: ID!, $text: String!) {
            addComment(eventId: $eventId, text: $text) {
              _id
              event
              user
              userSnapshot { name icon }
              text
              likes
              dislikes
              likesCount
              dislikesCount
              created_at
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("addComment", res, setUser, navigate, setBackendErr, true)
      return null
    }

    return res.data.data.addComment
  } catch (err: unknown) {
    graphQLErrors("addComment", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Toggle like on a comment.
export const toggleCommentLike = async (
  commentId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<SocialCommentType | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { commentId },
        query: `
          mutation ToggleCommentLike($commentId: ID!) {
            toggleCommentLike(commentId: $commentId) {
              _id likes dislikes likesCount dislikesCount
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("toggleCommentLike", res, setUser, navigate, setBackendErr, true)
      return null
    }

    return res.data.data.toggleCommentLike
  } catch (err: unknown) {
    graphQLErrors("toggleCommentLike", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Toggle dislike on a comment.
export const toggleCommentDislike = async (
  commentId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<SocialCommentType | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { commentId },
        query: `
          mutation ToggleCommentDislike($commentId: ID!) {
            toggleCommentDislike(commentId: $commentId) {
              _id likes dislikes likesCount dislikesCount
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("toggleCommentDislike", res, setUser, navigate, setBackendErr, true)
      return null
    }

    return res.data.data.toggleCommentDislike
  } catch (err: unknown) {
    graphQLErrors("toggleCommentDislike", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Update social event settings (privacy toggles).
export const updateSocialEventSettings = async (
  settings: Partial<SocialEventSettingsType>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { settings },
        query: `
          mutation UpdateSocialEventSettings($settings: SocialEventSettingsInput!) {
            updateSocialEventSettings(settings: $settings) {
              tokens
              socialEventSettings {
                badge_earned_epic badge_earned_legendary badge_earned_mythic
                champ_joined champ_created
                season_won season_runner_up round_won
                round_perfect_bet win_streak points_milestone
                rounds_milestone user_joined_platform adjudicator_promoted
              }
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("updateSocialEventSettings", res, setUser, navigate, setBackendErr, true)
      return false
    }

    const data = res.data.data.updateSocialEventSettings
    tokensHandler(user, data.tokens, setUser)

    // Update social event settings in state and localStorage.
    const updatedSettings = data.socialEventSettings
    localStorage.setItem("socialEventSettings", JSON.stringify(updatedSettings))

    setUser((prev) => ({
      ...prev,
      socialEventSettings: updatedSettings,
    }))

    return true
  } catch (err: unknown) {
    graphQLErrors("updateSocialEventSettings", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Fetch detailed following data (with championship snapshots and location) for a user.
export const getFollowingDetailed = async (
  userId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<FollowingDetailedUser[] | null> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { userId },
        query: `
          query GetFollowingDetailed($userId: ID!) {
            getFollowingDetailed(userId: $userId) {
              users {
                _id
                name
                icon
                championships { _id name icon updated_at }
                location { country }
              }
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("getFollowingDetailed", res, setUser, navigate, setBackendErr, true)
      return null
    }

    const data = res.data.data.getFollowingDetailed
    tokensHandler(user, data.tokens, setUser)

    return data.users
  } catch (err: unknown) {
    graphQLErrors("getFollowingDetailed", err, setUser, navigate, setBackendErr, true)
    return null
  }
}

// Update user's location for geo-based feed ranking.
export const updateLocation = async (
  location: { city?: string; region?: string; country?: string; lat?: number; lng?: number },
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { location },
        query: `
          mutation UpdateLocation($location: LocationInput!) {
            updateLocation(location: $location) {
              ${populateUser}
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("updateLocation", res, setUser, navigate, setBackendErr, true)
      return false
    }

    const data = res.data.data.updateLocation
    tokensHandler(user, data.tokens, setUser)

    return true
  } catch (err: unknown) {
    graphQLErrors("updateLocation", err, setUser, navigate, setBackendErr, true)
    return false
  }
}
