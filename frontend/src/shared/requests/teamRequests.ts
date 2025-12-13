import axios, { AxiosResponse } from "axios"
import { teamType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { uplaodS3 } from "./bucketRequests"
import moment from "moment"
import { populateTeam, populateTeamList } from "./requestPopulation"
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

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("teams", form.teamName, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) { setLoading(false); return null }

  // Store uploaded URL in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            url: iconURL,
            name: capitalise(form.teamName),
            nationality: form.nationality?.label,
            inceptionDate: moment(form.inceptionDate).format(),
            drivers: form.drivers.map(d => d._id),
          },
          query: `
            mutation NewTeam( $created_by: ID!, $url: String!, $name: String!, $nationality: String!, $inceptionDate: String!, $drivers: [ID!]) {
              newTeam(teamInput: { created_by: $created_by, url: $url, name: $name, nationality: $nationality, inceptionDate: $inceptionDate, drivers: $drivers }) {
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

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("teams", form.teamName, "icon", form.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && form.icon) { setLoading(false); return false }

  // Store uploaded URL in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: team._id,
            url: iconURL || team.url,
            name: capitalise(form.teamName),
            nationality: form.nationality?.label,
            inceptionDate: moment(form.inceptionDate).format(),
            drivers: form.drivers.map(d => d._id),
          },
          query: `
            mutation UpdateTeam( $_id: ID!, $url: String!, $name: String!, $nationality: String!, $inceptionDate: String!, $drivers: [ID!]) {
              updateTeam(teamInput: { _id: $_id, url: $url, name: $name, nationality: $nationality, inceptionDate: $inceptionDate, drivers: $drivers }) {
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
