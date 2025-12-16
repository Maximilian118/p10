import axios, { AxiosResponse } from "axios"
import { teamType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { uplaodS3 } from "./bucketRequests"
import moment from "moment"
import { populateTeam, populateTeamFull, populateTeamList } from "./requestPopulation"
import { createTeamFormType } from "../../page/CreateTeam/CreateTeam"
import { capitalise } from "../utility"

// Get all teams.
export const getTeams = async (
  setTeams: React.Dispatch<React.SetStateAction<teamType[]>>,
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
              getTeams {
                array {
                  ${populateTeamList}
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
          graphQLErrors("getTeams", res, setUser, navigate, setBackendErr, true)
        } else {
          const teams = graphQLResponse("getTeams", res, user, setUser) as {
            array: teamType[]
            token: string
            code: number
          }

          if (teams.array.length > 0) {
            setTeams(teams.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getTeams", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getTeams", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Get a single team by ID.
export const getTeamById = async (
  _id: string,
  setTeam: React.Dispatch<React.SetStateAction<teamType | null>>,
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
            query GetTeamById($_id: ID!) {
              getTeamById(_id: $_id) {
                ${populateTeamFull}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getTeamById", res, setUser, navigate, setBackendErr, true)
        } else {
          const team = graphQLResponse("getTeamById", res, user, setUser) as teamType
          setTeam(team)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getTeamById", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getTeamById", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Create a new team.
export const createTeam = async (
  form: createTeamFormType,
  setForm: React.Dispatch<React.SetStateAction<createTeamFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<teamType | null> => {
  setLoading(true)
  let team: teamType | null = null

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("teams", form.teamName, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) { setLoading(false); return null }

  const emblemURL = await uplaodS3("teams", form.teamName, "emblem", form.emblem, setBackendErr)
  if (!emblemURL && form.emblem) { setLoading(false); return null }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.emblem instanceof File && emblemURL) setForm((prev) => ({ ...prev, emblem: emblemURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            icon: iconURL,
            emblem: emblemURL,
            name: capitalise(form.teamName),
            nationality: form.nationality?.label,
            inceptionDate: moment(form.inceptionDate).format(),
            drivers: form.drivers.map(d => d._id),
          },
          query: `
            mutation NewTeam( $created_by: ID!, $icon: String!, $emblem: String!, $name: String!, $nationality: String!, $inceptionDate: String!, $drivers: [ID!]) {
              newTeam(teamInput: { created_by: $created_by, icon: $icon, emblem: $emblem, name: $name, nationality: $nationality, inceptionDate: $inceptionDate, drivers: $drivers }) {
                ${populateTeam}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("newTeam", res, setUser, navigate, setBackendErr, true)
        } else {
          team = graphQLResponse("newTeam", res, user, setUser, false) as teamType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newTeam", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newTeam", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return team
}

// Standalone update function for CreateTeam page.
export const editTeam = async (
  team: teamType,
  form: createTeamFormType,
  setForm: React.Dispatch<React.SetStateAction<createTeamFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("teams", form.teamName, "icon", form.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && form.icon) { setLoading(false); return false }

  const emblemURL = await uplaodS3("teams", form.teamName, "emblem", form.emblem, setBackendErr, user, setUser, navigate, 0)
  if (!emblemURL && form.emblem) { setLoading(false); return false }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.emblem instanceof File && emblemURL) setForm((prev) => ({ ...prev, emblem: emblemURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: team._id,
            icon: iconURL || team.icon,
            emblem: emblemURL || team.emblem,
            name: capitalise(form.teamName),
            nationality: form.nationality?.label,
            inceptionDate: moment(form.inceptionDate).format(),
            drivers: form.drivers.map(d => d._id),
          },
          query: `
            mutation UpdateTeam( $_id: ID!, $icon: String!, $emblem: String!, $name: String!, $nationality: String!, $inceptionDate: String!, $drivers: [ID!]) {
              updateTeam(teamInput: { _id: $_id, icon: $icon, emblem: $emblem, name: $name, nationality: $nationality, inceptionDate: $inceptionDate, drivers: $drivers }) {
                ${populateTeam}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateTeam", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("updateTeam", res, user, setUser, false)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateTeam", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateTeam", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

// Standalone delete function for CreateTeam page.
export const removeTeam = async (
  team: teamType,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  try {
    await axios
      .post(
        "",
        {
          variables: { _id: team._id },
          query: `
            mutation DeleteTeam( $_id: ID! ) {
              deleteTeam( _id: $_id ) {
                ${populateTeam}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("deleteTeam", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteTeam", res, user, setUser)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteTeam", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteTeam", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}
