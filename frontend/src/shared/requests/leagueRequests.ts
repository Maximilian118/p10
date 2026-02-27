import axios, { AxiosResponse } from "axios"
import { LeagueType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { uplaodS3 } from "./bucketRequests"
import { populateLeague, populateLeagueList } from "./requestPopulation"
import { capitalise } from "../utility"

// Form type for creating/editing a league.
export interface CreateLeagueFormType {
  name: string
  icon: File | string | null
  profile_picture: File | string | null
  series: string
  maxChampionships: number
  inviteOnly: boolean
}

// Fetches the user's most relevant league for the FloatingLeagueCard.
// Silently returns null on failure (non-critical UI element).
export const getMyTopLeague = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
): Promise<LeagueType | null> => {
  try {
    const res: AxiosResponse = await axios.post(
      "",
      {
        variables: {},
        query: `
          query {
            getMyTopLeague {
              _id
              name
              icon
              championships {
                championship {
                  _id
                  name
                  icon
                }
                active
                cumulativeAverage
                roundsCompleted
                missedRounds
                position
              }
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

    const result = graphQLResponse("getMyTopLeague", res, user, setUser) as LeagueType | null
    return result
  } catch {
    return null
  }
}

// Get all leagues.
export const getLeagues = async (
  setLeagues: React.Dispatch<React.SetStateAction<LeagueType[]>>,
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
              getLeagues {
                array {
                  ${populateLeagueList}
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
          graphQLErrors("getLeagues", res, setUser, navigate, setBackendErr, true)
        } else {
          const leagues = graphQLResponse("getLeagues", res, user, setUser) as {
            array: LeagueType[]
            token: string
            code: number
          }

          if (leagues.array.length > 0) {
            setLeagues(leagues.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getLeagues", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getLeagues", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Get a single league by ID.
export const getLeagueById = async (
  _id: string,
  setLeague: React.Dispatch<React.SetStateAction<LeagueType | null>>,
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
            query GetLeagueById($_id: ID!) {
              getLeagueById(_id: $_id) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getLeagueById", res, setUser, navigate, setBackendErr, true)
        } else {
          const league = graphQLResponse("getLeagueById", res, user, setUser) as LeagueType
          setLeague(league)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getLeagueById", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getLeagueById", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Create a new league.
export const createLeague = async (
  form: CreateLeagueFormType,
  setForm: React.Dispatch<React.SetStateAction<CreateLeagueFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  setLoading(true)
  let league: LeagueType | null = null

  // Upload images to S3.
  const iconURL = await uplaodS3("leagues", form.name, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) {
    setLoading(false)
    return null
  }

  const ppURL = await uplaodS3("leagues", form.name, "profile_picture", form.profile_picture, setBackendErr)
  if (!ppURL && form.profile_picture) {
    setLoading(false)
    return null
  }

  // Store uploaded URLs in form state for retry.
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && ppURL) setForm((prev) => ({ ...prev, profile_picture: ppURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            name: capitalise(form.name),
            icon: iconURL,
            profile_picture: ppURL,
            series: form.series,
            maxChampionships: form.maxChampionships,
            inviteOnly: form.inviteOnly,
          },
          query: `
            mutation CreateLeague($name: String!, $icon: String!, $profile_picture: String!, $series: ID!, $maxChampionships: Int, $inviteOnly: Boolean) {
              createLeague(input: { name: $name, icon: $icon, profile_picture: $profile_picture, series: $series, maxChampionships: $maxChampionships, inviteOnly: $inviteOnly }) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("createLeague", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("createLeague", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("createLeague", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("createLeague", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return league
}

// Join a league with a championship.
export const joinLeague = async (
  leagueId: string,
  champId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  let league: LeagueType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { leagueId, champId },
          query: `
            mutation JoinLeague($leagueId: ID!, $champId: ID!) {
              joinLeague(leagueId: $leagueId, champId: $champId) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("joinLeague", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("joinLeague", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("joinLeague", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("joinLeague", err, setUser, navigate, setBackendErr, true)
  }

  return league
}

// Leave a league with a championship.
export const leaveLeague = async (
  leagueId: string,
  champId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  let league: LeagueType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { leagueId, champId },
          query: `
            mutation LeaveLeague($leagueId: ID!, $champId: ID!) {
              leaveLeague(leagueId: $leagueId, champId: $champId) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("leaveLeague", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("leaveLeague", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("leaveLeague", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("leaveLeague", err, setUser, navigate, setBackendErr, true)
  }

  return league
}

// Update league settings.
export const updateLeagueSettings = async (
  _id: string,
  input: { name?: string; icon?: string; profile_picture?: string; maxChampionships?: number; inviteOnly?: boolean },
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  let league: LeagueType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { _id, ...input },
          query: `
            mutation UpdateLeagueSettings($_id: ID!, $name: String, $icon: String, $profile_picture: String, $maxChampionships: Int, $inviteOnly: Boolean) {
              updateLeagueSettings(_id: $_id, input: { name: $name, icon: $icon, profile_picture: $profile_picture, maxChampionships: $maxChampionships, inviteOnly: $inviteOnly }) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateLeagueSettings", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("updateLeagueSettings", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateLeagueSettings", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateLeagueSettings", err, setUser, navigate, setBackendErr, true)
  }

  return league
}

// Invite a championship to a league.
export const inviteChampionshipToLeague = async (
  leagueId: string,
  champId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  let league: LeagueType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { leagueId, champId },
          query: `
            mutation InviteChampionshipToLeague($leagueId: ID!, $champId: ID!) {
              inviteChampionshipToLeague(leagueId: $leagueId, champId: $champId) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("inviteChampionshipToLeague", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("inviteChampionshipToLeague", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("inviteChampionshipToLeague", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("inviteChampionshipToLeague", err, setUser, navigate, setBackendErr, true)
  }

  return league
}

// Revoke a championship invitation from a league.
export const revokeLeagueInvite = async (
  leagueId: string,
  champId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<LeagueType | null> => {
  let league: LeagueType | null = null

  try {
    await axios
      .post(
        "",
        {
          variables: { leagueId, champId },
          query: `
            mutation RevokeLeagueInvite($leagueId: ID!, $champId: ID!) {
              revokeLeagueInvite(leagueId: $leagueId, champId: $champId) {
                ${populateLeague}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("revokeLeagueInvite", res, setUser, navigate, setBackendErr, true)
        } else {
          league = graphQLResponse("revokeLeagueInvite", res, user, setUser, false) as LeagueType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("revokeLeagueInvite", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("revokeLeagueInvite", err, setUser, navigate, setBackendErr, true)
  }

  return league
}

// Delete a league.
export const deleteLeague = async (
  _id: string,
  confirmName: string,
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
          variables: { _id, confirmName },
          query: `
            mutation DeleteLeague($_id: ID!, $confirmName: String!) {
              deleteLeague(_id: $_id, confirmName: $confirmName) {
                _id
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("deleteLeague", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteLeague", res, user, setUser)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteLeague", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteLeague", err, setUser, navigate, setBackendErr, true)
  }

  return success
}
