import axios, { AxiosResponse } from "axios"
import { driverType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { populateDriver } from "./requestPopulation"
import { createDriverFormType } from "../../page/CreateDriver/CreateDriver"
import { uplaodS3 } from "./bucketRequests"
import moment from "moment"
import { capitalise, onlyNumbers } from "../utility"

// Get all drivers.
export const getDrivers = async (
  setDrivers: React.Dispatch<React.SetStateAction<driverType[]>>,
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
              getDrivers {
                array {
                  ${populateDriver}
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
          graphQLErrors("getDrivers", res, setUser, navigate, setBackendErr, true)
        } else {
          const drivers = graphQLResponse("getDrivers", res, user, setUser) as {
            array: driverType[]
            token: string
            code: number
          }

          if (drivers.array.length > 0) {
            setDrivers(drivers.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getDrivers", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getDrivers", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Create a new driver.
export const createDriver = async (
  form: createDriverFormType,
  setForm: React.Dispatch<React.SetStateAction<createDriverFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<driverType | null> => {
  setLoading(true)
  let driver: driverType | null = null

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("drivers", form.driverName, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) { setLoading(false); return null }

  const profilePictureURL = await uplaodS3("drivers", form.driverName, "profile-picture", form.profile_picture, setBackendErr)
  if (!profilePictureURL && form.profile_picture) { setLoading(false); return null }

  const bodyURL = await uplaodS3("drivers", form.driverName, "body", form.body, setBackendErr)
  if (!bodyURL && form.body) { setLoading(false); return null }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && profilePictureURL) setForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))
  if (form.body instanceof File && bodyURL) setForm((prev) => ({ ...prev, body: bodyURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            icon: iconURL,
            profile_picture: profilePictureURL,
            body: bodyURL || null,
            name: capitalise(form.driverName),
            driverID: form.driverID,
            teams: form.teams.map((team) => team._id),
            nationality: form.nationality?.label,
            heightCM: onlyNumbers(form.heightCM!),
            weightKG: onlyNumbers(form.weightKG!),
            birthday: moment(form.birthday).format(),
            moustache: form.moustache,
            mullet: form.mullet,
          },
          query: `
            mutation NewDriver(
              $created_by: ID!,
              $icon: String!,
              $profile_picture: String!,
              $body: String,
              $name: String!,
              $driverID: String!,
              $teams: [ID!],
              $nationality: String!
              $heightCM: Int!,
              $weightKG: Int!,
              $birthday: String!,
              $moustache: Boolean!,
              $mullet: Boolean!,
            ) {
              newDriver(
                driverInput: {
                  created_by: $created_by,
                  icon: $icon,
                  profile_picture: $profile_picture,
                  body: $body,
                  name: $name,
                  driverID: $driverID,
                  teams: $teams,
                  nationality: $nationality,
                  heightCM: $heightCM,
                  weightKG: $weightKG,
                  birthday: $birthday,
                  moustache: $moustache,
                  mullet: $mullet,
                }
              ) {
                ${populateDriver}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("newDriver", res, setUser, navigate, setBackendErr, true)
        } else {
          driver = graphQLResponse("newDriver", res, user, setUser) as driverType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newDriver", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newDriver", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return driver
}

// Standalone update function for CreateDriver page.
export const editDriver = async (
  driver: driverType,
  form: createDriverFormType,
  setForm: React.Dispatch<React.SetStateAction<createDriverFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("drivers", form.driverName, "icon", form.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && form.icon) { setLoading(false); return false }

  const profilePictureURL = await uplaodS3("drivers", form.driverName, "profile-picture", form.profile_picture, setBackendErr, user, setUser, navigate, 0)
  if (!profilePictureURL && form.profile_picture) { setLoading(false); return false }

  const bodyURL = await uplaodS3("drivers", form.driverName, "body", form.body, setBackendErr, user, setUser, navigate, 0)
  if (!bodyURL && form.body) { setLoading(false); return false }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && profilePictureURL) setForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))
  if (form.body instanceof File && bodyURL) setForm((prev) => ({ ...prev, body: bodyURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: driver._id,
            icon: iconURL || driver.icon,
            profile_picture: profilePictureURL || driver.profile_picture,
            body: bodyURL || driver.body,
            name: capitalise(form.driverName),
            driverID: form.driverID,
            teams: form.teams.map((team) => team._id!),
            nationality: form.nationality?.label,
            heightCM: onlyNumbers(form.heightCM!),
            weightKG: onlyNumbers(form.weightKG!),
            birthday: moment(form.birthday).format(),
            moustache: form.moustache,
            mullet: form.mullet,
          },
          query: `
            mutation UpdateDriver(
              $_id: ID,
              $icon: String,
              $profile_picture: String,
              $body: String,
              $name: String!,
              $driverID: String!,
              $teams: [ID!],
              $nationality: String!,
              $heightCM: Int!,
              $weightKG: Int!,
              $birthday: String!,
              $moustache: Boolean!,
              $mullet: Boolean!,
            ) {
              updateDriver(
                driverInput: {
                  _id: $_id,
                  icon: $icon,
                  profile_picture: $profile_picture,
                  body: $body,
                  name: $name,
                  driverID: $driverID,
                  teams: $teams,
                  nationality: $nationality,
                  heightCM: $heightCM,
                  weightKG: $weightKG,
                  birthday: $birthday,
                  moustache: $moustache,
                  mullet: $mullet,
                }
              ) {
                ${populateDriver}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateDriver", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("updateDriver", res, user, setUser, false)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateDriver", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateDriver", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

// Standalone delete function for CreateDriver page.
export const removeDriver = async (
  driver: driverType,
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
          variables: { _id: driver._id },
          query: `
            mutation DeleteDriver( $_id: ID! ) {
              deleteDriver( _id: $_id ) {
                ${populateDriver}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("deleteDriver", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteDriver", res, user, setUser)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteDriver", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteDriver", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}
