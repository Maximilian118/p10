import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { AdjustmentResultType, ChampType, FloatingChampType, formType, pointsStructureType, RoundStatus, ruleOrRegType, ruleSubsectionType } from "../types"
import { uplaodS3 } from "./bucketRequests"
import { createChampFormType } from "../../page/CreateChamp/CreateChamp"
import { populateChamp } from "./requestPopulation"
import { newBadge } from "./badgeRequests"

// Fetches all championships for the authenticated user.
export const getChamps = async (
  setChamps: React.Dispatch<React.SetStateAction<ChampType[]>>,
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
          variables: {},
          query: `
            query {
              getChamps {
                array {
                  _id
                  name
                  icon
                  profile_picture
                  season
                  active
                  created_at
                  updated_at
                  competitors {
                    _id
                    icon
                  }
                  rounds {
                    round
                    status
                    competitors {
                      competitor {
                        _id
                        icon
                      }
                    }
                  }
                  adjudicator {
                    current {
                      _id
                    }
                  }
                  settings {
                    inviteOnly
                    maxCompetitors
                  }
                  invited {
                    _id
                  }
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
          graphQLErrors("getChamps", res, setUser, navigate, setBackendErr, true)
        } else {
          const champs = graphQLResponse("getChamps", res, user, setUser) as {
            array: ChampType[]
            token: string
            code: number
          }

          if (champs.array.length > 0) {
            setChamps(champs.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getChamps", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getChamps", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Fetches the user's most actionable championship (lightweight for FloatingChampCard).
export const getMyTopChampionship = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
): Promise<FloatingChampType | null> => {
  try {
    const res: AxiosResponse = await axios.post(
      "",
      {
        variables: {},
        query: `
          query {
            getMyTopChampionship {
              _id
              name
              icon
              currentRoundStatus
              currentRound
              totalRounds
              tokens
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      return null
    }

    const result = graphQLResponse("getMyTopChampionship", res, user, setUser) as FloatingChampType | null
    return result
  } catch {
    return null
  }
}

// Creates a new championship with all form data
export const createChamp = async (
  form: createChampFormType,
  setForm: React.Dispatch<React.SetStateAction<createChampFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<ChampType | null> => {
  setLoading(true)

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3(
    "championships",
    form.champName,
    "icon",
    form.icon,
    setBackendErr,
    user,
    setUser,
    navigate,
  )
  if (!iconURL && form.icon) {
    setLoading(false)
    return null
  }

  const profilePictureURL = await uplaodS3(
    "championships",
    form.champName,
    "profile-picture",
    form.profile_picture,
    setBackendErr,
    user,
    setUser,
    navigate,
  )
  if (!profilePictureURL && form.profile_picture) {
    setLoading(false)
    return null
  }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && profilePictureURL)
    setForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))

  // Process badges - upload images for custom badges and create in database.
  const champBadgeIds: string[] = []
  for (const badge of form.champBadges) {
    if (badge.isDefault && badge._id) {
      // Default badge - just use existing ID.
      champBadgeIds.push(badge._id)
    } else {
      // Custom badge - upload image to S3 first if it's a File.
      let badgeUrl = badge.url
      if (badge.file instanceof File) {
        const uploadedUrl = await uplaodS3(
          "badges",
          "custom",
          "icon",
          badge.file,
          setBackendErr,
          user,
          setUser,
          navigate,
        )
        if (!uploadedUrl) {
          setLoading(false)
          return null
        }
        badgeUrl = uploadedUrl
      }

      // Create badge in database via newBadge mutation.
      const createdBadge = await newBadge(
        {
          url: badgeUrl,
          name: badge.name,
          customName: badge.customName,
          rarity: badge.rarity,
          awardedHow: badge.awardedHow,
          awardedDesc: badge.awardedDesc,
          zoom: badge.zoom,
        },
        user,
        setUser,
        navigate,
        setBackendErr,
      )

      if (createdBadge?._id) {
        champBadgeIds.push(createdBadge._id)
      } else {
        setLoading(false)
        return null
      }
    }
  }

  // Build rules and regs list (strip out user info - backend will add it)
  const rulesAndRegsList = form.rulesAndRegs.map((rule: ruleOrRegType) => ({
    default: rule.default,
    text: rule.text,
    subsections:
      rule.subsections?.map((sub: ruleSubsectionType) => ({
        text: sub.text,
      })) || [],
  }))

  try {
    let result: ChampType | null = null

    await axios
      .post(
        "",
        {
          variables: {
            name: form.champName,
            icon: iconURL,
            profile_picture: profilePictureURL,
            series: form.series?._id,
            rounds: typeof form.rounds === "string" ? parseInt(form.rounds, 10) : form.rounds,
            maxCompetitors: form.series?.drivers?.length || 24,
            pointsStructure: form.pointsStructure,
            rulesAndRegs: rulesAndRegsList,
            champBadges: champBadgeIds,
            inviteOnly: form.inviteOnly,
          },
          query: `
            mutation CreateChamp(
              $name: String!,
              $icon: String,
              $profile_picture: String,
              $series: ID!,
              $rounds: Int!,
              $maxCompetitors: Int,
              $pointsStructure: [PointsStructureInput!]!,
              $rulesAndRegs: [RuleInput!]!,
              $champBadges: [ID!],
              $inviteOnly: Boolean
            ) {
              createChamp(champInput: {
                name: $name,
                icon: $icon,
                profile_picture: $profile_picture,
                series: $series,
                rounds: $rounds,
                maxCompetitors: $maxCompetitors,
                pointsStructure: $pointsStructure,
                rulesAndRegs: $rulesAndRegs,
                champBadges: $champBadges,
                inviteOnly: $inviteOnly
              }) {
                _id
                name
                icon
                profile_picture
                season
                active
                created_at
                updated_at
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("createChamp", res, setUser, navigate, setBackendErr, true)
        } else {
          const champ = graphQLResponse("createChamp", res, user, setUser, false) as ChampType
          result = champ
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("createChamp", err, setUser, navigate, setBackendErr, true)
      })

    setLoading(false)
    return result
  } catch (err: unknown) {
    graphQLErrors("createChamp", err, setUser, navigate, setBackendErr, true)
    setLoading(false)
    return null
  }
}

// Fetches a single championship by ID with full populated data.
export const getChampById = async (
  _id: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
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
          variables: { _id },
          query: `
            query GetChampById($_id: ID!) {
              getChampById(_id: $_id) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getChampById", res, setUser, navigate, setBackendErr, true)
        } else {
          const champ = graphQLResponse("getChampById", res, user, setUser) as ChampType
          setChamp(champ)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getChampById", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getChampById", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Updates championship profile picture (adjudicator only).
export const updateChampPP = async <T extends formType>(
  champId: string,
  form: T,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  setLoading(true)

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3(
    "championships",
    form.champName || "championship",
    "icon",
    form.icon,
    setBackendErr,
    user,
    setUser,
    navigate,
    2,
  )
  if (!iconURL && form.icon) {
    setLoading(false)
    return
  }

  const ppURL = await uplaodS3(
    "championships",
    form.champName || "championship",
    "profile_picture",
    form.profile_picture ?? null,
    setBackendErr,
    user,
    setUser,
    navigate,
    2,
  )
  if (!ppURL && form.profile_picture) {
    setLoading(false)
    return
  }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && ppURL)
    setForm((prev) => ({ ...prev, profile_picture: ppURL }))

  // Only proceed if we have both URLs (either newly uploaded or existing).
  if (!iconURL || !ppURL) {
    setLoading(false)
    return
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: champId,
            icon: iconURL,
            profile_picture: ppURL,
          },
          query: `
            mutation UpdateChampPP($_id: ID!, $icon: String!, $profile_picture: String!) {
              updateChampPP(_id: $_id, icon: $icon, profile_picture: $profile_picture) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateChampPP", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("updateChampPP", res, user, setUser) as ChampType
          setChamp(updatedChamp)

          setForm((prevForm) => {
            return {
              ...prevForm,
              icon: null,
              profile_picture: null,
            }
          })
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateChampPP", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateChampPP", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Joins a championship as a competitor.
export const joinChamp = async (
  _id: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id },
          query: `
            mutation JoinChamp($_id: ID!) {
              joinChamp(_id: $_id) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("joinChamp", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("joinChamp", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("joinChamp", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("joinChamp", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Invites a user to an invite-only championship (adjudicator or admin only).
export const inviteUser = async (
  champId: string,
  userId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId, userId },
          query: `
            mutation InviteUser($_id: ID!, $userId: ID!) {
              inviteUser(_id: $_id, userId: $userId) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("inviteUser", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("inviteUser", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("inviteUser", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("inviteUser", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Updates the status of a round (adjudicator or admin only).
// Returns true on success, false on failure.
export const updateRoundStatus = async (
  champId: string,
  roundIndex: number,
  status: RoundStatus,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<ChampType | null> => {
  let result: ChampType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: champId,
            input: { roundIndex, status },
          },
          query: `
            mutation UpdateRoundStatus($_id: ID!, $input: UpdateRoundStatusInput!) {
              updateRoundStatus(_id: $_id, input: $input) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateRoundStatus", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("updateRoundStatus", res, user, setUser) as ChampType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateRoundStatus", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateRoundStatus", err, setUser, navigate, setBackendErr, true)
  }

  return result
}

// Places a bet on a driver for a round.
// Returns the updated championship on success, null on failure.
export const placeBet = async (
  champId: string,
  roundIndex: number,
  driverId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<ChampType | null> => {
  let result: ChampType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: champId,
            input: { roundIndex, driverId },
          },
          query: `
            mutation PlaceBet($_id: ID!, $input: PlaceBetInput!) {
              placeBet(_id: $_id, input: $input) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("placeBet", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("placeBet", res, user, setUser) as ChampType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("placeBet", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("placeBet", err, setUser, navigate, setBackendErr, true)
  }

  return result
}

// Submits driver positions after betting closes (adjudicator only).
// This triggers points calculation and transitions to results view.
// Returns the updated championship on success, null on failure.
export const submitDriverPositions = async (
  champId: string,
  roundIndex: number,
  driverPositions: { driverId: string; positionActual: number }[],
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<ChampType | null> => {
  let result: ChampType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: champId,
            input: { roundIndex, driverPositions },
          },
          query: `
            mutation SubmitDriverPositions($_id: ID!, $input: SubmitDriverPositionsInput!) {
              submitDriverPositions(_id: $_id, input: $input) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("submitDriverPositions", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("submitDriverPositions", res, user, setUser) as ChampType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("submitDriverPositions", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("submitDriverPositions", err, setUser, navigate, setBackendErr, true)
  }

  return result
}

// Settings update options.
interface ChampSettingsUpdate {
  name?: string
  skipCountDown?: boolean
  skipResults?: boolean
  inviteOnly?: boolean
  active?: boolean
  rounds?: number
  maxCompetitors?: number
  pointsStructure?: pointsStructureType
  icon?: string
  profile_picture?: string
  automation?: {
    enabled?: boolean
    bettingWindow?: {
      autoOpen?: boolean
      autoOpenTime?: number
      autoClose?: boolean
      autoCloseTime?: number
    }
    round?: {
      autoNextRound?: boolean
      autoNextRoundTime?: number
    }
  }
  protests?: {
    alwaysVote?: boolean
    allowMultiple?: boolean
    expiry?: number
  }
  ruleChanges?: {
    alwaysVote?: boolean
    allowMultiple?: boolean
    expiry?: number
  }
}

// Updates championship settings (adjudicator only).
// Returns the updated champ on success, or null on failure.
export const updateChampSettings = async (
  _id: string,
  settings: ChampSettingsUpdate,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<ChampType | null> => {
  let result: ChampType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { _id, settings },
          query: `
            mutation UpdateChampSettings($_id: ID!, $settings: ChampSettingsInput!) {
              updateChampSettings(_id: $_id, settings: $settings) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateChampSettings", res, setUser, navigate, setBackendErr, true)
        } else {
          result = graphQLResponse("updateChampSettings", res, user, setUser) as ChampType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateChampSettings", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateChampSettings", err, setUser, navigate, setBackendErr, true)
  }

  return result
}

// Admin settings input type for updateAdminSettings mutation.
interface AdminSettingsUpdate {
  adjCanSeeBadges?: boolean
}

// Updates admin-only settings for a championship.
export const updateAdminSettings = async (
  _id: string,
  settings: AdminSettingsUpdate,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  try {
    await axios
      .post(
        "",
        {
          variables: { _id, settings },
          query: `
            mutation UpdateAdminSettings($_id: ID!, $settings: AdminSettingsInput!) {
              updateAdminSettings(_id: $_id, settings: $settings) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateAdminSettings", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("updateAdminSettings", res, user, setUser) as ChampType
          setChamp(updatedChamp)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateAdminSettings", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateAdminSettings", err, setUser, navigate, setBackendErr, true)
  }
}

// Deletes a championship (requires name confirmation).
export const deleteChamp = async (
  _id: string,
  confirmName: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<{ _id: string; name: string } | null> => {
  let result: { _id: string; name: string } | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { _id, confirmName },
          query: `
            mutation DeleteChamp($_id: ID!, $confirmName: String!) {
              deleteChamp(_id: $_id, confirmName: $confirmName) {
                _id
                name
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("deleteChamp", res, setUser, navigate, setBackendErr, true)
        } else {
          const deleted = graphQLResponse("deleteChamp", res, user, setUser) as {
            _id: string
            name: string
          }
          result = deleted
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteChamp", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteChamp", err, setUser, navigate, setBackendErr, true)
  }

  return result
}

// Bans a competitor from a championship (adjudicator or admin only).
// The competitor will be removed from the active roster but their points remain.
export const banCompetitor = async (
  champId: string,
  competitorId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId, competitorId },
          query: `
            mutation BanCompetitor($_id: ID!, $competitorId: ID!) {
              banCompetitor(_id: $_id, competitorId: $competitorId) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("banCompetitor", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("banCompetitor", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("banCompetitor", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("banCompetitor", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Unbans a competitor from a championship (adjudicator or admin only).
export const unbanCompetitor = async (
  champId: string,
  competitorId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId, competitorId },
          query: `
            mutation UnbanCompetitor($_id: ID!, $competitorId: ID!) {
              unbanCompetitor(_id: $_id, competitorId: $competitorId) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("unbanCompetitor", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("unbanCompetitor", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("unbanCompetitor", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("unbanCompetitor", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Kicks a competitor from a championship (adjudicator or admin only).
// Unlike ban, kicked users CAN rejoin the championship later.
export const kickCompetitor = async (
  champId: string,
  competitorId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId, competitorId },
          query: `
            mutation KickCompetitor($_id: ID!, $competitorId: ID!) {
              kickCompetitor(_id: $_id, competitorId: $competitorId) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("kickCompetitor", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("kickCompetitor", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("kickCompetitor", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("kickCompetitor", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Allows a competitor to leave a championship voluntarily.
export const leaveChampionship = async (
  champId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId },
          query: `
            mutation LeaveChampionship($_id: ID!) {
              leaveChampionship(_id: $_id) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("leaveChampionship", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("leaveChampionship", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("leaveChampionship", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("leaveChampionship", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Promotes a competitor to adjudicator (adjudicator or admin only).
// Transfers adjudicator role and updates user permissions.
export const promoteAdjudicator = async (
  champId: string,
  newAdjudicatorId: string,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: champId, newAdjudicatorId },
          query: `
            mutation PromoteAdjudicator($_id: ID!, $newAdjudicatorId: ID!) {
              promoteAdjudicator(_id: $_id, newAdjudicatorId: $newAdjudicatorId) {
                ${populateChamp}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("promoteAdjudicator", res, setUser, navigate, setBackendErr, true)
        } else {
          const updatedChamp = graphQLResponse("promoteAdjudicator", res, user, setUser) as ChampType
          setChamp(updatedChamp)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("promoteAdjudicator", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("promoteAdjudicator", err, setUser, navigate, setBackendErr, true)
  }

  return success
}

// Debounce state for adjustment requests.
// Accumulates rapid clicks and sends a single request.
const adjustmentDebounceMap = new Map<string, {
  timeout: NodeJS.Timeout
  accumulatedChange: number
  resolve: (value: boolean) => void
}>()

// Updates a competitor's grandTotalPoints across all rounds.
// Used for both optimistic updates and rollbacks.
const updateCompetitorGrandTotal = (
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  competitorId: string,
  delta: number,
): void => {
  setChamp((prevChamp) => {
    if (!prevChamp) return prevChamp
    const updatedRounds = prevChamp.rounds.map((round) => ({
      ...round,
      competitors: round.competitors.map((comp) =>
        comp.competitor?._id === competitorId
          ? { ...comp, grandTotalPoints: comp.grandTotalPoints + delta }
          : comp
      ),
    }))
    return { ...prevChamp, rounds: updatedRounds }
  })
}

// Adjusts a competitor's points (adjudicator or admin only).
// Uses optimistic updates and debouncing for rapid clicks.
export const adjustCompetitorPoints = async (
  champId: string,
  competitorId: string,
  change: number,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  const debounceKey = `${champId}-${competitorId}`

  // Apply optimistic update immediately.
  updateCompetitorGrandTotal(setChamp, competitorId, change)

  // Check for existing debounce.
  const existing = adjustmentDebounceMap.get(debounceKey)
  if (existing) {
    clearTimeout(existing.timeout)
    existing.accumulatedChange += change
    return new Promise((resolve) => {
      existing.resolve = resolve
      existing.timeout = setTimeout(() => sendAdjustmentRequest(
        debounceKey, champId, competitorId, existing.accumulatedChange,
        setChamp, user, setUser, navigate, setBackendErr, existing.resolve
      ), 300)
    })
  }

  // Create new debounce entry.
  return new Promise((resolve) => {
    adjustmentDebounceMap.set(debounceKey, {
      timeout: setTimeout(() => sendAdjustmentRequest(
        debounceKey, champId, competitorId, change,
        setChamp, user, setUser, navigate, setBackendErr, resolve
      ), 300),
      accumulatedChange: change,
      resolve,
    })
  })
}

// Sends the actual adjustment request after debounce.
const sendAdjustmentRequest = async (
  debounceKey: string,
  champId: string,
  competitorId: string,
  totalChange: number,
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  resolve: (value: boolean) => void,
): Promise<void> => {
  adjustmentDebounceMap.delete(debounceKey)

  try {
    const res = await axios.post(
      "",
      {
        variables: { _id: champId, competitorId, change: totalChange },
        query: `
          mutation AdjustCompetitorPoints($_id: ID!, $competitorId: ID!, $change: Int!) {
            adjustCompetitorPoints(_id: $_id, competitorId: $competitorId, change: $change) {
              competitorId
              roundIndex
              adjustment { adjustment type reason updated_at created_at }
              grandTotalPoints
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      // Rollback optimistic update on error.
      updateCompetitorGrandTotal(setChamp, competitorId, -totalChange)
      graphQLErrors("adjustCompetitorPoints", res, setUser, navigate, setBackendErr, true)
      resolve(false)
    } else {
      const result = res.data.data.adjustCompetitorPoints as AdjustmentResultType
      // Update state with server-confirmed data.
      setChamp((prevChamp) => {
        if (!prevChamp) return prevChamp
        const updatedRounds = [...prevChamp.rounds]
        const round = updatedRounds[result.roundIndex]
        if (round) {
          round.competitors = round.competitors.map((comp) =>
            comp.competitor?._id === competitorId
              ? { ...comp, adjustment: result.adjustment, grandTotalPoints: result.grandTotalPoints }
              : comp
          )
        }
        return { ...prevChamp, rounds: updatedRounds }
      })
      resolve(true)
    }
  } catch (err: unknown) {
    updateCompetitorGrandTotal(setChamp, competitorId, -totalChange)
    graphQLErrors("adjustCompetitorPoints", err, setUser, navigate, setBackendErr, true)
    resolve(false)
  }
}
