import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { badgeType } from "../types"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { capitalise } from "../utility"

export const newBadge = async (
  badge: badgeType,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<badgeType | null> => {
  if (setLoading) setLoading(true)

  let result: badgeType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...badge,
            customName: badge.customName ? capitalise(badge.customName) : undefined,
          },
          query: `
            mutation NewBadge($championship: String, $url: String!, $name: String!, $customName: String, $rarity: Int!, $awardedHow: String!, $awardedDesc: String!, $zoom: Int) {
              newBadge(badgeInput: { championship: $championship, url: $url, name: $name, customName: $customName, rarity: $rarity, awardedHow: $awardedHow, awardedDesc: $awardedDesc, zoom: $zoom }) {
                _id
                url
                name
                customName
                rarity
                awardedHow
                awardedDesc
                zoom
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("newBadge", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("newBadge", res, user, setUser, false) as badgeType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newBadge", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newBadge", err, setUser, navigate, setBackendErr, true)
  }

  if (setLoading) setLoading(false)
  return result
}

export const getBadgesByChamp = async <T extends { champBadges: badgeType[] }>(
  championship: string | null,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setForm?: React.Dispatch<React.SetStateAction<T>>,
  setDefaults?: React.Dispatch<React.SetStateAction<badgeType[]>>, // For component local state
  setDefaultBadges?: React.Dispatch<React.SetStateAction<badgeType[]>>, // For component remote state
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: {
            championship,
          },
          query: `
            query GetBadgesByChamp ( $championship: String ) {
              getBadgesByChamp ( championship: $championship ) {
                array {
                  _id
                  championship
                  url
                  name
                  customName
                  rarity
                  awardedTo
                  awardedHow
                  awardedDesc
                  zoom
                  created_at
                  updated_at
                }
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getBadgesByChamp", res, setUser, navigate, setBackendErr, true)
        } else {
          const badges = graphQLResponse("getBadgesByChamp", res, user, setUser) as {
            array: badgeType[]
            token: string
            code: number
          }

          if (!championship) {
            badges.array = badges.array.map((badge: badgeType) => {
              return {
                ...badge,
                default: true,
              }
            })
          }

          if (setForm && badges.array.length > 0) {
            setForm((prevForm) => {
              return {
                ...prevForm,
                champBadges: badges.array,
              }
            })
          }

          if (setDefaults) {
            setDefaults(badges.array)
          }

          if (setDefaultBadges) {
            setDefaultBadges(badges.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getBadgesByChamp", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getBadgesByChamp", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

export const updateBadge = async (
  badge: badgeType,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: badge,
          query: `
            mutation UpdateBadge($_id: ID!, $url: String, $name: String, $customName: String, $rarity: Int, $awardedHow: String, $awardedDesc: String, $zoom: Int) {
              updateBadge(updateBadgeInput: { _id: $_id, url: $url, name: $name, customName: $customName, rarity: $rarity, awardedHow: $awardedHow, awardedDesc: $awardedDesc, zoom: $zoom }) {
                _id
                customName
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateBadge", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("updateBadge", res, user, setUser)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateBadge", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateBadge", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Set or unset a badge's featured position (1-6) on the user's profile.
// position: 1-6 to feature, null/0 to unfeature.
export const setFeaturedBadge = async (
  badgeId: string,
  position: number | null,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> => {
  if (setLoading) setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: { badgeId, position },
          query: `
            mutation SetFeaturedBadge($badgeId: ID!, $position: Int) {
              setFeaturedBadge(badgeId: $badgeId, position: $position) {
                _id
                badges {
                  _id
                  featured
                }
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("setFeaturedBadge", res, setUser, navigate, setBackendErr, true)
        } else {
          const response = res.data.data.setFeaturedBadge
          graphQLResponse("setFeaturedBadge", res, user, setUser)

          // Update user.badges with the new featured values from the response and persist to localStorage
          setUser((prev) => {
            const updatedBadges = prev.badges.map((badge) => {
              const updated = response.badges.find(
                (b: { _id: string; featured: number | null }) => b._id === badge._id
              )
              return updated ? { ...badge, featured: updated.featured } : badge
            })
            localStorage.setItem("badges", JSON.stringify(updatedBadges))
            return { ...prev, badges: updatedBadges }
          })
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("setFeaturedBadge", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("setFeaturedBadge", err, setUser, navigate, setBackendErr, true)
  }

  if (setLoading) setLoading(false)
}

// Delete a badge from the database and S3.
export const deleteBadge = async (
  _id: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<badgeType | null> => {
  setLoading(true)

  let result: badgeType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { _id },
          query: `
            mutation DeleteBadge($_id: ID!) {
              deleteBadge(_id: $_id) {
                _id
                url
                name
                customName
                rarity
                awardedHow
                awardedDesc
                zoom
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("deleteBadge", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("deleteBadge", res, user, setUser, false) as badgeType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteBadge", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteBadge", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return result
}
