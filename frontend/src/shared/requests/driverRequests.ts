import axios, { AxiosResponse } from "axios"
import { driverType } from "../types"
import { userType } from "../localStorage"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { populateDriver } from "./requestPopulation"
import { driverEditFormType } from "../../components/utility/driverPicker/driverEdit/DriverEdit"
import { createDriverFormType } from "../../page/CreateDriver/CreateDriver"
import { uplaodS3 } from "./bucketRequests"
import moment from "moment"
import { capitalise, onlyNumbers } from "../utility"

export const newDriver = async <T extends { drivers: driverType[] }>(
  editForm: driverEditFormType, // form state of driver
  setEditForm: React.Dispatch<React.SetStateAction<driverEditFormType>>, // form state of driver being edited
  setForm: React.Dispatch<React.SetStateAction<T>>, // form state of driver group
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("drivers", editForm.driverName, "icon", editForm.icon, setBackendErr)
  if (!iconURL && editForm.icon) { setLoading(false); return false }

  const profilePictureURL = await uplaodS3("drivers", editForm.driverName, "profile-picture", editForm.profile_picture, setBackendErr)
  if (!profilePictureURL && editForm.profile_picture) { setLoading(false); return false }

  const bodyURL = await uplaodS3("drivers", editForm.driverName, "body", editForm.body, setBackendErr)
  if (!bodyURL && editForm.body) { setLoading(false); return false }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (editForm.icon instanceof File && iconURL) setEditForm((prev) => ({ ...prev, icon: iconURL }))
  if (editForm.profile_picture instanceof File && profilePictureURL) setEditForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))
  if (editForm.body instanceof File && bodyURL) setEditForm((prev) => ({ ...prev, body: bodyURL }))

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
            name: capitalise(editForm.driverName),
            driverID: editForm.driverID,
            teams: editForm.teams.map((team) => team._id),
            nationality: editForm.nationality?.label,
            heightCM: onlyNumbers(editForm.heightCM!),
            weightKG: onlyNumbers(editForm.weightKG!),
            birthday: moment(editForm.birthday).format(),
            moustache: editForm.moustache,
            mullet: editForm.mullet,
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
          const driver = graphQLResponse("newDriver", res, user, setUser) as driverType

          setForm((prevForm) => {
            return {
              ...prevForm,
              drivers: [...prevForm.drivers, driver],
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newDriver", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newDriver", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

export const updateDriver = async <T extends { drivers: driverType[] }>(
  driver: driverType, // driver that's being updated
  editForm: driverEditFormType, // form state for driver
  setEditForm: React.Dispatch<React.SetStateAction<driverEditFormType>>, // form state of driver being edited
  setForm: React.Dispatch<React.SetStateAction<T>>, // form state for driver group
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<boolean> => {
  if (setLoading) setLoading(true)
  let success = false

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("drivers", editForm.driverName, "icon", editForm.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && editForm.icon) { if (setLoading) setLoading(false); return false }

  const profilePictureURL = await uplaodS3("drivers", editForm.driverName, "profile-picture", editForm.profile_picture, setBackendErr, user, setUser, navigate, 0)
  if (!profilePictureURL && editForm.profile_picture) { if (setLoading) setLoading(false); return false }

  const bodyURL = await uplaodS3("drivers", editForm.driverName, "body", editForm.body, setBackendErr, user, setUser, navigate, 0)
  if (!bodyURL && editForm.body) { if (setLoading) setLoading(false); return false }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (editForm.icon instanceof File && iconURL) setEditForm((prev) => ({ ...prev, icon: iconURL }))
  if (editForm.profile_picture instanceof File && profilePictureURL) setEditForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))
  if (editForm.body instanceof File && bodyURL) setEditForm((prev) => ({ ...prev, body: bodyURL }))

  const updatedDriver = {
    icon: iconURL || driver.icon,
    profile_picture: profilePictureURL || driver.profile_picture,
    body: bodyURL || driver.body,
    name: editForm.driverName,
    nationality: editForm.nationality!.label,
    heightCM: onlyNumbers(editForm.heightCM!),
    weightKG: onlyNumbers(editForm.weightKG!),
    birthday: moment(editForm.birthday).format(),
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...editForm,
            ...updatedDriver,
            teams: editForm.teams.map((team) => team._id!),
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
          const newDriver = graphQLResponse("updateDriver", res, user, setUser, false) as driverType

          // Update this driver in editForm.drivers
          setForm((prevForm) => {
            return {
              ...prevForm,
              drivers: prevForm.drivers.map((d) => {
                if (d._id === driver._id) {
                  return newDriver
                } else {
                  return d
                }
              }),
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateDriver", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateDriver", err, setUser, navigate, setBackendErr, true)
  }

  if (setLoading) setLoading(false)
  return success
}

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

export const deleteDriver = async <T extends { drivers: driverType[] }>(
  driver: driverType,
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
            _id: driver._id,
          },
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

          // Remove this driver from the drivers array
          setForm((prevForm) => {
            return {
              ...prevForm,
              drivers: prevForm.drivers.filter((d) => d._id !== driver._id),
            }
          })

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

// Standalone create function for CreateDriver page.
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
