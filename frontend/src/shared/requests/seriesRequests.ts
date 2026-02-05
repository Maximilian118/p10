import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { seriesType } from "../types"
import { createSeriesFormType } from "../../page/CreateSeries/CreateSeries"
import { populateSeries, populateSeriesFull } from "./requestPopulation"
import { uplaodS3 } from "./bucketRequests"
import { capitalise } from "../utility"

// Get all series.
export const getSeries = async (
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>,
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
              getSeries {
                array {
                  ${populateSeries}
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
          graphQLErrors("getSeries", res, setUser, navigate, setBackendErr, true)
        } else {
          const seriesList = graphQLResponse("getSeries", res, user, setUser) as {
            array: seriesType[]
            token: string
            code: number
          }

          if (seriesList.array.length > 0) {
            setSeriesList(seriesList.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getSeries", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getSeries", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Create a new series.
export const createSeries = async (
  form: createSeriesFormType,
  setForm: React.Dispatch<React.SetStateAction<createSeriesFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<seriesType | null> => {
  setLoading(true)
  let series: seriesType | null = null

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", form.seriesName, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) { setLoading(false); return null }

  const profilePictureURL = await uplaodS3("series", form.seriesName, "profile-picture", form.profile_picture, setBackendErr)
  if (!profilePictureURL && form.profile_picture) { setLoading(false); return null }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && profilePictureURL) setForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            icon: iconURL,
            profile_picture: profilePictureURL,
            name: capitalise(form.seriesName),
            drivers: form.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation NewSeries( $created_by: ID!, $icon: String!, $profile_picture: String!, $name: String!, $drivers: [ID!]! ) {
              newSeries(seriesInput: { created_by: $created_by, icon: $icon, profile_picture: $profile_picture, name: $name, drivers: $drivers }) {
                ${populateSeries}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("newSeries", res, setUser, navigate, setBackendErr, true)
        } else {
          series = graphQLResponse("newSeries", res, user, setUser, false) as seriesType
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newSeries", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newSeries", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return series
}

// Standalone update function for CreateSeries page.
export const editSeries = async (
  seriesItem: seriesType,
  form: createSeriesFormType,
  setForm: React.Dispatch<React.SetStateAction<createSeriesFormType>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", form.seriesName, "icon", form.icon, setBackendErr, user, setUser, navigate, 2)
  if (!iconURL && form.icon) { setLoading(false); return false }

  const profilePictureURL = await uplaodS3("series", form.seriesName, "profile-picture", form.profile_picture, setBackendErr, user, setUser, navigate, 2)
  if (!profilePictureURL && form.profile_picture) { setLoading(false); return false }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))
  if (form.profile_picture instanceof File && profilePictureURL) setForm((prev) => ({ ...prev, profile_picture: profilePictureURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: seriesItem._id,
            icon: iconURL || seriesItem.icon,
            profile_picture: profilePictureURL || seriesItem.profile_picture,
            name: capitalise(form.seriesName),
            drivers: form.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation UpdateSeries( $_id: ID!, $icon: String!, $profile_picture: String!, $name: String!, $drivers: [ID!]) {
              updateSeries(seriesInput: { _id: $_id, icon: $icon, profile_picture: $profile_picture, name: $name, drivers: $drivers }) {
                ${populateSeries}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateSeries", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("updateSeries", res, user, setUser, false)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateSeries", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateSeries", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

// Standalone delete function for CreateSeries page.
export const removeSeries = async (
  seriesItem: seriesType,
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
          variables: { _id: seriesItem._id },
          query: `
            mutation DeleteSeries( $_id: ID! ) {
              deleteSeries( _id: $_id ) {
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
          graphQLErrors("deleteSeries", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteSeries", res, user, setUser)
          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteSeries", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteSeries", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

// Get a single series by ID.
export const getSeriesById = async (
  _id: string,
  setSeries: React.Dispatch<React.SetStateAction<seriesType | null>>,
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
            query GetSeriesById($_id: ID!) {
              getSeriesById(_id: $_id) {
                ${populateSeriesFull}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getSeriesById", res, setUser, navigate, setBackendErr, true)
        } else {
          const series = graphQLResponse("getSeriesById", res, user, setUser) as seriesType
          setSeries(series)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getSeriesById", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getSeriesById", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}
