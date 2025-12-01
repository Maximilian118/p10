import { logout, tokensHandler, userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"

export const formatString = (str: string) => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-")
}

// Format name of all files to be uploaded to s3.
export const formatFilename = (userName: string, category: string, file: File): string => {
  const username = formatString(userName)
  const cat = formatString(category)
  const filename = formatString(file.name)

  return `${username}/${cat}/${filename}`
}

export const getFilename = (url: string): string => {
  return url.split("/").pop() as string
}

type errorType = {
  type: string
  message: string
  code: number | null
  value: unknown
  locations: readonly string[]
  path: readonly (string | number)[]
}

export interface graphQLErrorType extends errorType {
  request: string
  originalErrors: errorType[]
}

export let initGraphQLError: graphQLErrorType = {
  request: "",
  type: "",
  message: "",
  code: null,
  value: null,
  locations: [],
  path: [],
  originalErrors: [],
}

type axiosGraphqlErrObj = {
  data?: {
    errors: errorType[]
  }
  response?: {
    data: {
      errors: errorType[]
    }
  }
}

// Find errors from an axios graphql request, wherever they might be and return an array of graphQLErrors.
const findErrs = (err: unknown): errorType[] => {
  const errObj = err as axiosGraphqlErrObj
  if (errObj?.response) {
    return errObj.response.data.errors
  }

  if (errObj?.data) {
    return errObj.data.errors
  }

  return []
}

// Format and return a GraphQL Error from an Axios request.
export const graphQLErrors = (
  request: string,
  err: unknown,
  setUser?: React.Dispatch<React.SetStateAction<userType>> | undefined,
  navigate?: NavigateFunction | undefined,
  setBackendErr?: React.Dispatch<React.SetStateAction<graphQLErrorType>> | undefined,
  log?: boolean,
): graphQLErrorType[] => {
  // Initialise the error response array.
  const errsArr: errorType[] = []

  // Find all of the errors.
  const errs = findErrs(err)

  // Loop through all of the errors.
  for (const err of errs) {
    // Errors that can break the loop if true:
    // If no connection to backend.
    if (err.message === "Network Error") {
      errsArr.push(err)
      break
    }

    // If user tokens have expired.
    if (err.message === "Not Authenticated!") {
      errsArr.push(err)
      logout(setUser, navigate)
      break
    }

    // Errors that can collectively be in the array:
    // If type of error is unhandled by the backend.
    if (!err.type || err.type === "Unknown") {
      errsArr.push({
        ...err,
        message: `Unknown Error: ${err.message}`,
        code: 500,
      })
      // If error is handled by the backend.
    } else {
      errsArr.push(err)
    }
  }

  // Add request and original errors.
  const graphQLErrors = errsArr.map((err: errorType): graphQLErrorType => {
    return {
      ...err,
      request,
      originalErrors: errsArr,
    }
  })

  // setBackendErr with the first item in graphQLErrors array.
  if (setBackendErr) {
    setBackendErr((prevErr) => {
      return {
        ...prevErr,
        ...graphQLErrors[0],
      }
    })
  }

  if (log) {
    console.error(graphQLErrors)
  }

  return graphQLErrors
}

// Format and return a GraphQL response from an Axios request.
export const graphQLResponse = (
  request: string,
  res: {
    data: {
      data: {
        [key: string]: { tokens?: string[]; code?: number; array?: [] }
      }
    }
  },
  user?: userType,
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  log?: boolean,
  code?: number,
): object => {
  let obj = res.data.data[request]

  if (user && setUser) {
    tokensHandler(user, obj.tokens, setUser)
  }

  obj = {
    ...obj,
    code: code ? code : 200,
  }

  if (log) {
    console.log(obj)
  }

  return obj
}

// Loop through an array of strings. If any of those strings matches the current backendErr.type
// or at least matches a word then return true.
export const hasBackendErr = (types: string[], backendErr: graphQLErrorType): boolean => {
  let match = false

  if (backendErr.type && backendErr.message) {
    types.forEach((type) => {
      if (backendErr.type.toLowerCase().includes(type.toLowerCase())) {
        match = true
      }
    })
  }

  return match
}

// Add headers to a request
// prettier-ignore
export const headers = (token: string): {
  "Content-Type": string,
  accessToken: string,
  refreshToken: string,
} => {
  const refreshToken = localStorage.getItem("refresh_token")

  return {
    "Content-Type": "application/json",
    accessToken: `Bearer ${token}`,
    refreshToken: `Bearer ${refreshToken}`,
  }
}
