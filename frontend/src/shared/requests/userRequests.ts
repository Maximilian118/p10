import axios, { AxiosResponse } from "axios"
import { createFormType } from "../../page/Create"
import { userType, logInSuccess, logout } from "../localStorage"
import { populateUser, populateUserProfile } from "./requestPopulation"
import { uplaodS3 } from "./bucketRequests"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { tokensHandler } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { loginFormType } from "../../page/Login/Login"
import { forgotFormType } from "../../page/Forgot"
import { formType, userProfileType } from "../types"
import { passFormType } from "../../page/Password/Password"

export const createUser = async <U extends { dropzone: string }>(
  form: createFormType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  navigate: NavigateFunction,
  setFormErr: React.Dispatch<React.SetStateAction<U>>,
): Promise<void> => {
  setLoading(true)

  // Validate that profile picture is uploaded (icon is derived from the same upload).
  if (!form.icon || !form.profile_picture) {
    setFormErr((prevErrs) => ({ ...prevErrs, dropzone: "A profile picture is required." }))
    setLoading(false)
    return
  }

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3("users", form.name, "icon", form.icon, setBackendErr)
  if (!iconURL && form.icon) {
    setFormErr((prevErrs) => ({ ...prevErrs, dropzone: "Failed to upload image." }))
    setLoading(false)
    return
  }

  const ppURL = await uplaodS3(
    "users",
    form.name,
    "profile_picture",
    form.profile_picture,
    setBackendErr,
  )
  if (!ppURL && form.profile_picture) {
    setFormErr((prevErrs) => ({ ...prevErrs, dropzone: "Failed to upload image." }))
    setLoading(false)
    return
  }

  try {
    await axios
      .post("", {
        variables: {
          ...form,
          icon: iconURL,
          profile_picture: ppURL,
        },
        query: `
          mutation CreateUser(
            $name: String!,
            $email: String!,
            $password: String!,
            $passConfirm: String!,
            $icon: String!,
            $profile_picture: String!
          ) { 
            createUser(
              userInput: {
                name: $name, 
                email: $email, 
                password: $password, 
                passConfirm: $passConfirm, 
                icon: $icon, 
                profile_picture: $profile_picture
              }
            ) {
              ${populateUser}
            }
          }
        `,
      })
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("createUser", res, setUser, navigate, setBackendErr, true)
        } else {
          logInSuccess("createUser", res, setUser, true)
          navigate("/")
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("createUser", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("createUser", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

export const login = async (
  form: loginFormType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  navigate: NavigateFunction,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post("", {
        variables: form,
        query: `
        query Login($email: String!, $password: String) {
          login(email: $email, password: $password) {
            ${populateUser}
          }
        }
      `,
      })
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("login", res, setUser, navigate, setBackendErr, true)
        } else {
          logInSuccess("login", res, setUser, true)
          navigate("/")
        }
      })
      .catch((err: unknown) => {
        console.log(err)
        graphQLErrors("login", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("login", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

export const forgot = async (
  form: forgotFormType,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post("", {
        variables: form,
        query: `
          mutation Forgot($email: String!) {
            forgot(email: $email)
          }
        `,
      })
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("forgot", res, undefined, undefined, setBackendErr, true)
        } else {
          setSuccess(true)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("forgot", err, undefined, undefined, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("forgot", err, undefined, undefined, setBackendErr, true)
  }

  setLoading(false)
}

export const updatePP = async <T extends formType>(
  form: T,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  setLoading(true)

  // Upload images to S3 (uplaodS3 handles File/string/null internally).
  const iconURL = await uplaodS3(
    "users",
    user.name,
    "icon",
    form.icon,
    setBackendErr,
    user,
    setUser,
    navigate,
    2,
  )
  if (!iconURL && form.icon) {
    setLoading(false)
    return
  }

  const ppURL = await uplaodS3(
    "users",
    user.name,
    "profile_picture",
    form.profile_picture ?? null,
    setBackendErr,
    user,
    setUser,
    navigate,
    2,
  )
  if (!ppURL && form.profile_picture) {
    setLoading(false)
    return
  }

  // Store uploaded URLs in form state for retry (only if File was uploaded).
  if (form.icon instanceof File && iconURL) setForm((prev) => ({ ...prev, icon: iconURL }) as T)
  if (form.profile_picture instanceof File && ppURL)
    setForm((prev) => ({ ...prev, profile_picture: ppURL }) as T)

  try {
    await axios
      .post(
        "",
        {
          variables: {
            ...form,
            icon: iconURL,
            profile_picture: ppURL,
          },
          query: `
            mutation UpdatePP($icon: String!, $profile_picture: String!) {
              updatePP(icon: $icon, profile_picture: $profile_picture) {
                icon
                profile_picture
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updatePP", res, setUser, navigate, setBackendErr, true)
        } else {
          const response = graphQLResponse("updatePP", res, user, setUser) as userType

          setUser((prevUser) => {
            return {
              ...prevUser,
              icon: response.icon,
              profile_picture: response.profile_picture,
            }
          })

          setForm((prevForm) => {
            return {
              ...prevForm,
              icon: null,
              profile_picture: null,
            }
          })

          localStorage.setItem("icon", response.icon)
          localStorage.setItem("profile_picture", response.profile_picture)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updatePP", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updatePP", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Initiates email change by sending a verification email to the new address.
// Does not update email immediately - user must click verification link.
export const updateEmail = async <T extends formType>(
  form: T,
  setForm: React.Dispatch<React.SetStateAction<T>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: form,
          query: `
            mutation UpdateEmail($email: String!) {
              updateEmail(email: $email)
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updateEmail", res, setUser, navigate, setBackendErr, true)
        } else {
          // Email not changed yet - verification email sent.
          // User must click the link in their email to confirm the change.
          setSuccess(true)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updateEmail", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updateEmail", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Confirms email change using verification token from email link.
export const confirmEmailChange = async (
  token: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> => {
  setLoading(true)

  try {
    const res = await axios.post(
      "",
      {
        variables: { token },
        query: `
          mutation ConfirmEmailChange($token: String!) {
            confirmEmailChange(token: $token) {
              _id
              email
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      const errorMessage = res.data.errors[0]?.message || "Verification failed."
      try {
        const parsed = JSON.parse(errorMessage)
        setError(parsed.message || "Invalid or expired verification link.")
      } catch {
        setError(errorMessage)
      }
    } else {
      const response = res.data.data.confirmEmailChange
      // Update user state with new email.
      setUser((prev) => ({ ...prev, email: response.email }))
      localStorage.setItem("email", response.email)
      setSuccess(true)
      // Redirect to profile after short delay.
      setTimeout(() => navigate("/profile"), 2000)
    }
  } catch {
    setError("Failed to verify email. Please try again.")
  }

  setLoading(false)
}

// Updates user profile fields (name, email, icon, profile_picture).
// Only sends fields that have changed from original values.
// Returns emailChanged boolean to trigger email verification notice.
export const updateUser = async <T extends formType>(
  form: T,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<{ success: boolean; emailChanged: boolean }> => {
  setLoading(true)

  // Build input with only changed fields.
  const input: { name?: string; email?: string; icon?: string; profile_picture?: string } = {}

  if (form.name && form.name !== user.name) {
    input.name = form.name
  }

  if (form.email && form.email !== user.email) {
    input.email = form.email
  }

  // Handle profile picture upload if File objects are in form.
  if (form.icon instanceof File || form.profile_picture instanceof File) {
    const iconURL = await uplaodS3(
      "users",
      user.name,
      "icon",
      form.icon,
      setBackendErr,
      user,
      setUser,
      navigate,
      2,
    )
    if (!iconURL && form.icon) {
      setLoading(false)
      return { success: false, emailChanged: false }
    }

    const ppURL = await uplaodS3(
      "users",
      user.name,
      "profile_picture",
      form.profile_picture ?? null,
      setBackendErr,
      user,
      setUser,
      navigate,
      2,
    )
    if (!ppURL && form.profile_picture) {
      setLoading(false)
      return { success: false, emailChanged: false }
    }

    if (iconURL) input.icon = iconURL
    if (ppURL) input.profile_picture = ppURL
  }

  // If nothing changed, return early.
  if (Object.keys(input).length === 0) {
    setLoading(false)
    return { success: false, emailChanged: false }
  }

  try {
    const res = await axios.post(
      "",
      {
        variables: { input },
        query: `
          mutation UpdateUser($input: UpdateUserInput!) {
            updateUser(input: $input) {
              user {
                name
                email
                icon
                profile_picture
                tokens
              }
              emailChanged
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("updateUser", res, setUser, navigate, setBackendErr, true)
      setLoading(false)
      return { success: false, emailChanged: false }
    }

    const response = res.data.data.updateUser
    const updatedUser = response.user

    // Update user state with new values.
    setUser((prev) => ({
      ...prev,
      name: updatedUser.name,
      icon: updatedUser.icon,
      profile_picture: updatedUser.profile_picture,
      // Don't update email yet if emailChanged - wait for verification.
    }))

    // Update localStorage.
    localStorage.setItem("name", updatedUser.name)
    localStorage.setItem("icon", updatedUser.icon)
    localStorage.setItem("profile_picture", updatedUser.profile_picture)

    setLoading(false)
    return { success: true, emailChanged: response.emailChanged }
  } catch (err: unknown) {
    graphQLErrors("updateUser", err, setUser, navigate, setBackendErr, true)
    setLoading(false)
    return { success: false, emailChanged: false }
  }
}

export const updatePassword = async <T extends passFormType>(
  form: T,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: NavigateFunction,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: form,
          query: `
            mutation UpdatePassword($currentPass: String!, $password: String!, $passConfirm: String!) {
              updatePassword(currentPass: $currentPass, password: $password, passConfirm: $passConfirm) {
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("updatePassword", res, setUser, navigate, setBackendErr, true)
        } else {
          graphQLResponse("updatePassword", res, user, setUser) as userType
          setSuccess(true)
          logout(setUser)
          navigate("/pass-success")
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("updatePassword", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("updatePassword", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Fetches a user by ID with populated championships and badges.
export const getUserById = async (
  _id: string,
  setUserProfile: React.Dispatch<React.SetStateAction<userProfileType | null>>,
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
            query GetUserById($_id: ID!) {
              getUserById(_id: $_id) {
                ${populateUserProfile}
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getUserById", res, setUser, navigate, setBackendErr, true)
        } else {
          const userProfile = graphQLResponse("getUserById", res, user, setUser) as userProfileType
          setUserProfile(userProfile)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getUserById", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getUserById", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Checks if the current user is an adjudicator of any championship.
export const checkIsAdjudicator = async (
  user: userType,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        query: `
          query IsAdjudicator {
            isAdjudicator {
              isAdjudicator
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      setBackendErr((prev) => ({
        ...prev,
        type: "isAdjudicator",
        message: res.data.errors[0]?.message || "Failed to check adjudicator status",
      }))
      return false
    }

    return res.data.data.isAdjudicator.isAdjudicator
  } catch {
    return false
  }
}

// Deletes the current user's account.
export const deleteAccount = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  setLoading(true)

  try {
    const res = await axios.post(
      "",
      {
        query: `
          mutation DeleteAccount {
            deleteAccount {
              success
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("deleteAccount", res, setUser, navigate, setBackendErr, true)
    } else {
      // Account deleted - log out and redirect to home.
      logout(setUser, navigate)
    }
  } catch (err: unknown) {
    graphQLErrors("deleteAccount", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Basic user type for invite functionality (minimal data).
export interface UserBasicType {
  _id: string
  name: string
  icon: string
}

// Fetches all users with minimal data for invite functionality.
export const getUsers = async (
  setUsers: React.Dispatch<React.SetStateAction<UserBasicType[]>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  limit?: number,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: { limit },
          query: `
            query GetUsers($limit: Int) {
              getUsers(limit: $limit) {
                array {
                  _id
                  name
                  icon
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
          graphQLErrors("getUsers", res, setUser, navigate, setBackendErr, true)
        } else {
          const usersData = graphQLResponse("getUsers", res, user, setUser) as { array: UserBasicType[] }
          setUsers(usersData.array)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getUsers", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getUsers", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Follow a user. Adds target user to the authenticated user's following array.
export const followUser = async (
  userId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { userId },
        query: `
          mutation FollowUser($userId: ID!) {
            followUser(userId: $userId) {
              ${populateUser}
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("followUser", res, setUser, navigate, setBackendErr, true)
      return false
    }

    const data = res.data.data.followUser
    tokensHandler(user, data.tokens, setUser)

    // Update following in state and localStorage.
    const updatedFollowing = data.following as string[]
    localStorage.setItem("following", JSON.stringify(updatedFollowing))
    setUser((prev) => ({ ...prev, following: updatedFollowing }))

    return true
  } catch (err: unknown) {
    graphQLErrors("followUser", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Unfollow a user. Removes target user from the authenticated user's following array.
export const unfollowUser = async (
  userId: string,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<boolean> => {
  try {
    const res = await axios.post(
      "",
      {
        variables: { userId },
        query: `
          mutation UnfollowUser($userId: ID!) {
            unfollowUser(userId: $userId) {
              ${populateUser}
            }
          }
        `,
      },
      { headers: headers(user.token) },
    )

    if (res.data.errors) {
      graphQLErrors("unfollowUser", res, setUser, navigate, setBackendErr, true)
      return false
    }

    const data = res.data.data.unfollowUser
    tokensHandler(user, data.tokens, setUser)

    // Update following in state and localStorage.
    const updatedFollowing = data.following as string[]
    localStorage.setItem("following", JSON.stringify(updatedFollowing))
    setUser((prev) => ({ ...prev, following: updatedFollowing }))

    return true
  } catch (err: unknown) {
    graphQLErrors("unfollowUser", err, setUser, navigate, setBackendErr, true)
    return false
  }
}

// Fetch followed users as basic user objects. If userId is provided, fetches that user's following list.
export const getFollowing = async (
  setUsers: React.Dispatch<React.SetStateAction<UserBasicType[]>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
  userId?: string,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: { userId },
          query: `
            query GetFollowing($userId: ID) {
              getFollowing(userId: $userId) {
                array {
                  _id
                  name
                  icon
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
          graphQLErrors("getFollowing", res, setUser, navigate, setBackendErr, true)
        } else {
          const data = graphQLResponse("getFollowing", res, user, setUser) as { array: UserBasicType[] }
          setUsers(data.array)
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getFollowing", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getFollowing", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}
