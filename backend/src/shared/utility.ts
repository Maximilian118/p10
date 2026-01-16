import jwt from "jsonwebtoken"
import { genSalt, hash, compare } from "bcryptjs"
import { userType } from "../models/user"
import { GraphQLError, SourceLocation } from "graphql"
import {
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsCommandInput,
  ObjectIdentifier,
  PutObjectAclCommandInput,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3"
import { punctuation, throwError } from "../graphql/resolvers/resolverErrors"

// Sign Tokens with JWT.
export const signTokens = (user: userType) => {
  const access_token = jwt.sign(
    {
      _id: user._id,
    },
    `${process.env.ACCESS_TOKEN_SECRET}`,
    { expiresIn: "15m" },
  )

  const refresh_token = jwt.sign(
    {
      _id: user._id,
      refresh_count: user.refresh_count,
    },
    `${process.env.REFRESH_TOKEN_SECRET}`,
    { expiresIn: "7d" },
  )

  return [access_token, refresh_token]
}

// Hash a password.
export const hashPass = async (pass: string): Promise<string> => {
  const s = await genSalt(Number(process.env.PASSWORD_SALT))
  return hash(pass, s)
}

// Authenticate a password.
export const comparePass = async (pass: string, hashedPass: string): Promise<boolean> => {
  return await compare(pass, hashedPass)
}

// Check if a string has proper JSON interchange format.
const isJSON = (str: string) => {
  if (typeof str !== "string") return false
  try {
    const result = JSON.parse(str)
    const type = Object.prototype.toString.call(result)
    return type === "[object Object]" || type === "[object Array]"
  } catch (err) {
    return false
  }
}

// Receives error string, parses it, then returns a formatted error.
// prettier-ignore
export const formatErrHandler = ( error: GraphQLError ): {
  type: string
  message: string
  code: number
  value: unknown
  locations: readonly SourceLocation[]
  path: readonly (string | number)[]
} => {
  if (isJSON(error.message)) {
    const err = JSON.parse(error.message)

    return {
      type: err.type ? err.type : "",
      message: err.message ? err.message : "",
      code: err.code ? err.code : 400,
      value: err.value ? err.value : null,
      locations: error.locations ? error.locations : [],
      path: error.path ? error.path : [],
    }
  } else {
    return {
      type: "Unknown",
      message: error.message ? error.message : "",
      code: 400,
      value: null,
      locations: error.locations ? error.locations : [],
      path: error.path ? error.path : [],
    }
  }
}

// Check if passed key is already uploaded to AWS S3.
export const isDuplicateS3 = async (
  client: S3Client,
  params: PutObjectAclCommandInput,
): Promise<boolean> => {
  try {
    await client.send(new HeadObjectCommand(params))
    return true
  } catch (error) {
    return false
  }
}

export const clientS3 = (filename?: string) => {
  const bucket = process.env.AWS_BUCKET
  const region = process.env.AWS_REGION
  const accessKey = process.env.AWS_ACCESS_KEY_ID
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!bucket || !region || !accessKey || !secretKey) {
    throw throwError("Resolver: signS3", null, "Could not retrieve environment variables!")
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  })

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: filename,
    ACL: "public-read",
  }

  return Object.assign(s3Client, {
    bucket,
    region,
    accessKey,
    secretKey,
    params,
  })
}

// Delete all an image.
// Optionally, depending on depth, delete folder or folders parent and so on.
export const deleteS3 = async (
  client: S3Client,
  params: PutObjectAclCommandInput,
  depth?: number,
): Promise<punctuation | null> => {
  // An array of Keys to delete.
  const keyArr: ObjectIdentifier[] = []
  // If a key/filepath hasn't been provided.
  if (!params.Key) {
    return "No params.Key (filename) was found."
  }
  // Params for s3 search.
  const listParams: ListObjectsCommandInput = {
    Bucket: params.Bucket,
    Prefix: findPrefix(params.Key, depth),
  }

  try {
    // A list of all of the files that have been found under that filepath.
    const list = await client.send(new ListObjectsCommand(listParams))
    // Add all of the found file Keys to keyArr.
    list.Contents?.forEach((img) => {
      keyArr.push({
        Key: img.Key!,
      })
    })
  } catch (error) {
    return "Failed to list images..."
  }

  // Delete all files the match a key in keyArr.
  const deleteParams: DeleteObjectsCommandInput = {
    ...params,
    Delete: {
      Objects: keyArr,
    },
  }
  // Sumbit request for deletion.
  try {
    await client.send(new DeleteObjectsCommand(deleteParams))
  } catch (error) {
    return "Delete images failed..."
  }

  return null
}

// Check that a string has 1-3 uppercase letters only (A-Z).
export const isValidDriverID = (str: string): boolean => {
  return /^[A-Z]{1,3}$/.test(str)
}

// Legacy alias for backwards compatibility.
export const isThreeLettersUppercase = isValidDriverID
// Find the path for deletion. Default = target the specific file.
// Optionally add a depth number for targeting the entire folder or parent folder.
export const findPrefix = (filename: string, depth?: number): string => {
  // Split the params.Key (filename) into an array of strings.
  const fileNameArr = filename.split("/")
  // Find the string that matches the "amazonaws" substring.
  const foundString = fileNameArr.find((str) => str.includes("amazonaws"))
  // Find the index of that string with the substring.
  const index = foundString ? fileNameArr.indexOf(foundString) : -1
  // Init the array of strings that will have our strings to be joined.
  let preFixArr: string[] = []
  // Loop through fileNameArr and push all items that i > index to preFixArr.
  for (let i = 0; i < fileNameArr.length; i++) {
    if (i > index) {
      preFixArr.push(fileNameArr[i])
    }
  }
  // Optionally, remove all items that have i <= depth.
  if (depth) {
    for (let i = 0; i < preFixArr.length; i++) {
      if (i >= depth) {
        preFixArr.pop()
      }
    }
  }
  // Return joined preFixArr.
  return preFixArr.join("/")
}

// Capatalise the first letter in a string.
export const capitalise = (s: string) => (s && s[0].toUpperCase() + s.slice(1)) || ""

// Filter admin settings from champ data for non-admin users.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const filterChampForUser = (champ: any, isAdmin: boolean) => {
  if (isAdmin || !champ) return champ

  // Clone and remove admin settings.
  const filtered = { ...champ }
  if (filtered.settings) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin, ...settingsWithoutAdmin } = filtered.settings
    filtered.settings = settingsWithoutAdmin
  }
  return filtered
}
