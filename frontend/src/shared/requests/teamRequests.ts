import axios, { AxiosResponse } from "axios"
import { teamType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { teamEditFormType } from "../../components/utility/teamPicker/teamEdit/TeamEdit"
import { uplaodS3 } from "./bucketRequests"
import moment from "moment"
import { populateTeam, populateTeamList } from "./requestPopulation"
import { capitalise } from "../utility"

export const newTeam = async <T extends { teams: teamType[] }>(
  editForm: teamEditFormType,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let iconURL = ""
  let success = false

  if (editForm.icon) {
    iconURL = await uplaodS3(editForm.teamName, "icon", editForm.icon, setBackendErr) // prettier-ignore

    if (!iconURL) {
      setLoading(false)
      return false
    }
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            url: iconURL,
            name: capitalise(editForm.teamName),
            nationality: editForm.nationality?.label,
            inceptionDate: moment(editForm.inceptionDate).format(),
          },
          query: `
            mutation NewTeam( $created_by: ID!, $url: String!, $name: String!, $nationality: String!, $inceptionDate: String!) {
              newTeam(teamInput: { created_by: $created_by, url: $url, name: $name, nationality: $nationality, inceptionDate: $inceptionDate }) {
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
          const team = graphQLResponse("newTeam", res, user, setUser, false) as teamType

          setForm((prevForm) => {
            return {
              ...prevForm,
              teams: [...prevForm.teams, team],
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newTeam", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newTeam", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

export const updateTeam = async <T extends { teams: teamType[] }>(
  team: teamType,
  editForm: teamEditFormType,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let iconURL = ""
  let success = false

  if (editForm.icon) {
    iconURL = await uplaodS3(editForm.teamName, "icon", editForm.icon, setBackendErr, user, setUser, navigate, 0) // prettier-ignore

    if (!iconURL) {
      setLoading(false)
      return false
    }
  }

  const updatedTeam = {
    name: editForm.teamName,
    url: iconURL ? iconURL : team.url,
    nationality: editForm.nationality?.label,
    inceptionDate: moment(editForm.inceptionDate).format(),
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...editForm,
            ...updatedTeam,
          },
          query: `
            mutation UpdateTeam( $_id: ID!, $url: String!, $name: String!, $nationality: String!, $inceptionDate: String!) {
              updateTeam(teamInput: { _id: $_id, url: $url, name: $name, nationality: $nationality, inceptionDate: $inceptionDate }) {
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
          const newTeam = graphQLResponse("updateTeam", res, user, setUser, false) as teamType

          // Update this team in the teams array
          setForm((prevForm) => {
            return {
              ...prevForm,
              teams: prevForm.teams.map((t) => {
                if (t._id === team._id) {
                  return newTeam
                } else {
                  return t
                }
              }),
            }
          })

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

export const deleteTeam = async <T extends { teams: teamType[] }>(
  team: teamType,
  setForm: React.Dispatch<React.SetStateAction<T>>,
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
          variables: {
            _id: team._id,
          },
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

          // Remove this team from the teams array
          setForm((prevForm) => {
            return {
              ...prevForm,
              teams: prevForm.teams.filter((t) => t._id !== team._id),
            }
          })

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
