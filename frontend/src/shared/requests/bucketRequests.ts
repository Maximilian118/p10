import axios from "axios"
import {
  formatFilename,
  graphQLErrors,
  graphQLErrorType,
  graphQLResponse,
  headers,
} from "./requestsUtility"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"

const putS3 = async (
  file: File,
  signedRequest: string,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  return await axios
    .put(signedRequest, file, { headers: { "Content-Type": file.type } })
    .then((res: any) => {
      console.log(res)
    })
    .catch((err: any) => {
      graphQLErrors("putS3", err, undefined, undefined, setBackendErr, true)
    })
}

export const uplaodS3 = async (
  root: string, // Specify name of root folder.
  category: string, // Specify category in the root folder.
  file: File | null,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  user?: userType,
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  navigate?: NavigateFunction,
  deleteDepth?: number, // If on success you'd like to delete images before upload, specify depth.
): Promise<string> => {
  let url = ""

  if (!file) {
    return url
  }

  try {
    await axios
      .post("", {
        variables: {
          filename: formatFilename(root, category, file),
        },
        query: `
          query SignS3($filename: String!) {
            signS3(filename: $filename) {
              signedRequest
              url
              duplicate
            }
          }
        `,
      })
      .then(async (res: any) => {
        if (res.data.errors) {
          graphQLErrors("signS3", res, undefined, undefined, setBackendErr, true)
        } else {
          url = res.data.data.signS3.url
          // If the requested file upload is already in the DB, return.
          if (res.data.data.signS3.duplicate) {
            return
          }

          if (deleteDepth && user && setUser && navigate) {
            await deleteS3(url, user, setUser, navigate, setBackendErr, deleteDepth)
          }

          await putS3(file, res.data.data.signS3.signedRequest, setBackendErr)
        }
      })
      .catch((err: any) => {
        graphQLErrors("signS3", err, undefined, undefined, setBackendErr, true)
      })
  } catch (err: any) {
    graphQLErrors("signS3", err, undefined, undefined, setBackendErr, true)
  }

  return url
}

export const deleteS3 = async (
  url: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  depth?: number,
): Promise<void> => {
  try {
    await axios
      .post(
        "",
        {
          variables: {
            url,
            depth,
          },
          query: `
            mutation DeleteS3( $url: String!, $depth: Int ) {
              deleteS3( url: $url, depth: $depth ) {
                url
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: any) => {
        if (res.data.errors) {
          graphQLErrors("deleteS3", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("deleteS3", res, user, setUser, false)
        }
      })
      .catch((err: any) => {
        graphQLErrors("deleteS3", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: any) {
    graphQLErrors("deleteS3", err, setUser, navigate, setBackendErr, true)
  }
}
