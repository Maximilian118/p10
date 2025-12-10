import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { seriesType } from "../types"
import { seriesEditFormType } from "../../components/utility/seriesPicker/seriesEdit/SeriesEdit"
import { createSeriesFormType } from "../../page/CreateSeries/CreateSeries"
import { populateSeries } from "./requestPopulation"
import { uplaodS3 } from "./bucketRequests"
import { capitalise, sortAlphabetically } from "../utility"

// Create a new series from the series picker (used in CreateChamp).
export const newSeries = async <T extends { series: seriesType | null }>(
  editForm: seriesEditFormType,
  setEditForm: React.Dispatch<React.SetStateAction<seriesEditFormType>>,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>,
  setSelected: React.Dispatch<React.SetStateAction<string>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", editForm.seriesName, "icon", editForm.icon, setBackendErr)
  if (!iconURL && editForm.icon) { setLoading(false); return false }

  // Store uploaded URL in form state for retry (only if File was uploaded).
  if (editForm.icon instanceof File && iconURL) setEditForm((prev) => ({ ...prev, icon: iconURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            created_by: user._id,
            url: iconURL,
            name: capitalise(editForm.seriesName),
            drivers: editForm.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation NewSeries( $created_by: ID!, $url: String!, $name: String!, $drivers: [ID!]! ) {
              newSeries(seriesInput: { created_by: $created_by, url: $url, name: $name, drivers: $drivers }) {
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
          const series = graphQLResponse("newSeries", res, user, setUser, false) as seriesType // prettier-ignore

          setSeriesList((prevSeries) => sortAlphabetically([...prevSeries, series]))
          setSelected(() => series._id!)
          setForm((prevForm) => {
            return {
              ...prevForm,
              series,
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newSeries", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newSeries", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

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

// Update an existing series from the series picker.
export const updateSeries = async <T extends { series: seriesType | null }>(
  seriesItem: seriesType, // Series that's being updated.
  editForm: seriesEditFormType, // Form state for series being edited.
  setEditForm: React.Dispatch<React.SetStateAction<seriesEditFormType>>, // Form state setter for series being edited.
  setForm: React.Dispatch<React.SetStateAction<T>>, // Form state for champ form.
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setSeriesList?: React.Dispatch<React.SetStateAction<seriesType[]>>,
): Promise<boolean> => {
  setLoading(true)
  let success = false

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", editForm.seriesName, "icon", editForm.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && editForm.icon) { setLoading(false); return false }

  // Store uploaded URL in form state for retry (only if File was uploaded).
  if (editForm.icon instanceof File && iconURL) setEditForm((prev) => ({ ...prev, icon: iconURL }))

  const updatedSeries = {
    name: capitalise(editForm.seriesName),
    url: iconURL || seriesItem.url,
    drivers: editForm.drivers.map((driver) => driver._id!),
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...editForm,
            ...updatedSeries,
          },
          query: `
            mutation UpdateSeries( $_id: ID!, $url: String!, $name: String!, $drivers: [ID!]) {
              updateSeries(seriesInput: { _id: $_id, url: $url, name: $name, drivers: $drivers }) {
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
          const series = graphQLResponse("updateSeries", res, user, setUser, false) as seriesType // prettier-ignore
          // Mutate the updated series in series list state.
          if (setSeriesList) {
            setSeriesList((prevSeries) =>
              prevSeries.map((s) => {
                if (s._id === series._id) {
                  return {
                    ...s,
                    ...series,
                  }
                } else {
                  return s
                }
              }),
            )
          }
          // If the series is the currently selected series, mutate it.
          setForm((prevForm) => {
            const isSelected = prevForm.series?._id === seriesItem._id

            if (isSelected) {
              return {
                ...prevForm,
                series,
              }
            } else {
              return prevForm
            }
          })

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

// Delete a series from the series picker.
export const deleteSeries = async <T extends { series: seriesType | null }>(
  seriesItem: seriesType,
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>,
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
            _id: seriesItem._id,
          },
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

          // Remove this series if it's currently selected as the champs series.
          setForm((prevForm) => {
            const isSelected = prevForm.series?._id === seriesItem._id

            return {
              ...prevForm,
              series: isSelected ? null : prevForm.series,
            }
          })
          // Remove this series from all of the available series.
          setSeriesList((prevSeries) => prevSeries.filter((s) => s._id !== seriesItem._id))

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

// Simplified create function for the standalone CreateSeries page.
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

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", form.seriesName, "icon", form.icon, setBackendErr)
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
            name: capitalise(form.seriesName),
            drivers: form.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation NewSeries( $created_by: ID!, $url: String!, $name: String!, $drivers: [ID!]! ) {
              newSeries(seriesInput: { created_by: $created_by, url: $url, name: $name, drivers: $drivers }) {
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

  // Upload image to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("series", form.seriesName, "icon", form.icon, setBackendErr, user, setUser, navigate, 0)
  if (!iconURL && form.icon) { setLoading(false); return false }

  // Store uploaded URL in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }))

  try {
    await axios
      .post(
        "",
        {
          variables: {
            _id: seriesItem._id,
            url: iconURL || seriesItem.url,
            name: capitalise(form.seriesName),
            drivers: form.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation UpdateSeries( $_id: ID!, $url: String!, $name: String!, $drivers: [ID!]) {
              updateSeries(seriesInput: { _id: $_id, url: $url, name: $name, drivers: $drivers }) {
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
