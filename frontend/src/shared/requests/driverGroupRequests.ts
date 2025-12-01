import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { driverGroupType } from "../types"
import { driverGroupEditFormType } from "../../components/utility/driverGroupPicker/driverGroupEdit/DriverGroupEdit"
import { populateDriverGroup } from "./requestPopulation"
import { uplaodS3 } from "./bucketRequests"
import { capitalise, sortAlphabetically } from "../utility"

export const newDriverGroup = async <T extends { driverGroup: driverGroupType | null }>(
  editForm: driverGroupEditFormType,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>>,
  setSelected: React.Dispatch<React.SetStateAction<string>>,
): Promise<boolean> => {
  setLoading(true)
  let iconURL = ""
  let success = false

  if (editForm.icon) {
    iconURL = await uplaodS3(editForm.groupName, "icon", editForm.icon, setBackendErr) // prettier-ignore

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
            name: capitalise(editForm.groupName),
            drivers: editForm.drivers.map((driver) => driver._id!),
          },
          query: `
            mutation NewDriverGroup( $created_by: ID!, $url: String!, $name: String!, $drivers: [ID!]! ) {
              newDriverGroup(driverGroupInput: { created_by: $created_by, url: $url, name: $name, drivers: $drivers }) {
                ${populateDriverGroup}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("newDriverGroup", res, setUser, navigate, setBackendErr, true)
        } else {
          const driverGroup = graphQLResponse("newDriverGroup", res, user, setUser, false) as driverGroupType // prettier-ignore

          setGroups((prevGroups) => sortAlphabetically([...prevGroups, driverGroup]))
          setSelected(() => driverGroup._id!)
          setForm((prevForm) => {
            return {
              ...prevForm,
              driverGroup,
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("newDriverGroup", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("newDriverGroup", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

export const getDriverGroups = async (
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>>,
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
              getDriverGroups {
                array {
                  ${populateDriverGroup}
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
          graphQLErrors("getDriverGroups", res, setUser, navigate, setBackendErr, true)
        } else {
          const driverGroups = graphQLResponse("getDriverGroups", res, user, setUser) as {
            array: driverGroupType[]
            token: string
            code: number
          }

          if (driverGroups.array.length > 0) {
            setGroups(driverGroups.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getDriverGroups", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getDriverGroups", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

export const updateDriverGroup = async <T extends { driverGroup: driverGroupType | null }>(
  group: driverGroupType, // Group that's being updated
  editForm: driverGroupEditFormType, // Form state for Group being edited.
  setForm: React.Dispatch<React.SetStateAction<T>>, // Form state for champ form.
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setGroups?: React.Dispatch<React.SetStateAction<driverGroupType[]>>,
): Promise<boolean> => {
  setLoading(true)
  let iconURL = ""
  let success = false

  if (editForm.icon) {
    iconURL = await uplaodS3(editForm.groupName, "icon", editForm.icon, setBackendErr, user, setUser, navigate, 0) // prettier-ignore

    if (!iconURL) {
      setLoading(false)
      return false
    }
  }

  const updatedGroup = {
    name: capitalise(editForm.groupName),
    url: iconURL ? iconURL : group.url,
    drivers: editForm.drivers.map((driver) => driver._id!),
  }

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...editForm,
            ...updatedGroup,
          },
          query: `
            mutation UpdateDriverGroup( $_id: ID!, $url: String!, $name: String!, $drivers: [ID!]) {
              updateDriverGroup(driverGroupInput: { _id: $_id, url: $url, name: $name, drivers: $drivers }) {
                ${populateDriverGroup}
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateDriverGroup", res, setUser, navigate, setBackendErr, true)
        } else {
          const driverGroup = graphQLResponse("updateDriverGroup", res, user, setUser, false) as driverGroupType // prettier-ignore
          // Mutate the updated group in groups state.
          if (setGroups) {
            setGroups((prevGroups) =>
              prevGroups.map((g) => {
                if (g._id === driverGroup._id) {
                  return {
                    ...g,
                    ...driverGroup,
                  }
                } else {
                  return g
                }
              }),
            )
          }
          // If the driverGroup is the currently selected driver group, mutate it.
          setForm((prevForm) => {
            const isSelected = prevForm.driverGroup?._id === group._id

            if (isSelected) {
              return {
                ...prevForm,
                driverGroup,
              }
            } else {
              return prevForm
            }
          })

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateDriverGroup", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateDriverGroup", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}

export const deleteDriverGroup = async <T extends { driverGroup: driverGroupType | null }>(
  group: driverGroupType,
  setGroups: React.Dispatch<React.SetStateAction<driverGroupType[]>>,
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
            _id: group._id,
          },
          query: `
            mutation DeleteDriverGroup( $_id: ID! ) {
              deleteDriverGroup( _id: $_id ) {
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
          graphQLErrors("deleteDriverGroup", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteDriverGroup", res, user, setUser)

          // Remove this driver group if it's currently selected as the champs driverGroup
          setForm((prevForm) => {
            const isSelected = prevForm.driverGroup?._id === group._id

            return {
              ...prevForm,
              driverGroup: isSelected ? null : prevForm.driverGroup,
            }
          })
          // Remove this driver group from all of the available driver groups
          setGroups((prevGroups) => prevGroups.filter((g) => g._id !== group._id))

          success = true
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("deleteDriverGroup", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("deleteDriverGroup", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
  return success
}
