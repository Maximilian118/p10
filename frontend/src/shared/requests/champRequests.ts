import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { ChampType, formType, pointsStructureType, ruleOrRegType, ruleSubsectionType } from "../types"
import { uplaodS3 } from "./bucketRequests"
import { createChampFormType } from "../../page/CreateChamp"
import { populateChamp } from "./requestPopulation"

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

  // Build badge input - full data for custom badges, just _id for defaults.
  const champBadges = form.champBadges.map((badge) => {
    if (badge.default) {
      // Default badge - reference by existing _id.
      return { _id: badge._id, isDefault: true }
    } else {
      // Custom badge - send full data for backend to create.
      return {
        url: badge.url,
        name: badge.name,
        rarity: badge.rarity,
        awardedHow: badge.awardedHow,
        awardedDesc: badge.awardedDesc,
        zoom: badge.zoom,
        isDefault: false,
      }
    }
  })

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
            champBadges,
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

// Settings update options.
interface ChampSettingsUpdate {
  name?: string
  inviteOnly?: boolean
  rounds?: number
  maxCompetitors?: number
  pointsStructure?: pointsStructureType
  icon?: string
  profile_picture?: string
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
          variables: { _id, ...settings },
          query: `
            mutation UpdateChampSettings(
              $_id: ID!,
              $name: String,
              $inviteOnly: Boolean,
              $rounds: Int,
              $maxCompetitors: Int,
              $pointsStructure: [PointsStructureInput!],
              $icon: String,
              $profile_picture: String
            ) {
              updateChampSettings(
                _id: $_id,
                name: $name,
                inviteOnly: $inviteOnly,
                rounds: $rounds,
                maxCompetitors: $maxCompetitors,
                pointsStructure: $pointsStructure,
                icon: $icon,
                profile_picture: $profile_picture
              ) {
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
