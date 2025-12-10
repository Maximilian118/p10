import { NavigateFunction } from "react-router-dom"

export interface userType {
  _id: string
  token: string
  name: string
  email: string
  icon: string
  profile_picture: string
  championships: object[]
  badges: object[]
  created_at: string
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
    [key: string]: string | boolean
  }
  localStorage: boolean
  tokens?: string[]
}

// A user object template with falsy values.
const blankUser = {
  _id: "",
  token: "",
  name: "",
  email: "",
  icon: "",
  profile_picture: "",
  championships: [],
  badges: [],
  created_at: "",
  permissions: {
    admin: false,
    adjudicator: false,
    guest: false,
  },
  localStorage: false,
}

// If there are tokens in local storage, retrieve user object.
// Otherwise, call logout.
export const checkUserLS = (): userType => {
  const token = localStorage.getItem("access_token") || ""
  const refreshToken = localStorage.getItem("refresh_token") || ""

  if (!token && !refreshToken) {
    return logout()
  } else {
    const _id = localStorage.getItem("_id")
    const name = localStorage.getItem("name")
    const email = localStorage.getItem("email")
    const icon = localStorage.getItem("icon")
    const profile_picture = localStorage.getItem("profile_picture")
    const championships = localStorage.getItem("championships")
    const badges = localStorage.getItem("badges")
    const created_at = localStorage.getItem("created_at")
    const permissions = localStorage.getItem("permissions")

    const user: userType = {
      token,
      _id: _id ? _id : "",
      name: name ? name : "",
      email: email ? email : "",
      icon: icon ? icon : "",
      profile_picture: profile_picture ? profile_picture : "",
      championships: championships ? JSON.parse(championships) : blankUser.championships,
      badges: badges ? JSON.parse(badges) : blankUser.badges,
      created_at: created_at ? created_at : blankUser.created_at,
      permissions: permissions ? JSON.parse(permissions) : blankUser.permissions,
      localStorage: true,
    }

    return user
  }
}

// Log the user out removing all local storage and return a blank user object.
// If the navigate function is passed, navigate to /login.
export const logout = (
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  navigate?: NavigateFunction,
): userType => {
  localStorage.removeItem("_id")
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("name")
  localStorage.removeItem("email")
  localStorage.removeItem("icon")
  localStorage.removeItem("profile_picture")
  localStorage.removeItem("championships")
  localStorage.removeItem("badges")
  localStorage.removeItem("created_at")
  localStorage.removeItem("permissions")

  if (setUser) {
    setUser((prevUser) => {
      return {
        ...prevUser,
        ...blankUser,
      }
    })
  }

  if (navigate) navigate("/login")

  return blankUser
}

// Populate local storage and return the populated user object.
export const logInSuccess = (
  request: string,
  res: {
    data: {
      data: {
        [key: string]: userType
      }
    }
  },
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
  log?: boolean,
): userType => {
  const user = res.data.data[request]

  if (user.tokens) {
    user.token = tokensHandler(user, user.tokens)
  }

  if (!user.localStorage) {
    localStorage.setItem("_id", user._id)
    localStorage.setItem("name", user.name)
    localStorage.setItem("email", user.email)
    localStorage.setItem("icon", user.icon)
    localStorage.setItem("profile_picture", user.profile_picture)
    localStorage.setItem("championships", JSON.stringify(user.championships))
    localStorage.setItem("badges", JSON.stringify(user.badges))
    localStorage.setItem("created_at", user.created_at)
    localStorage.setItem("permissions", JSON.stringify(user.permissions))
  }

  if (setUser) {
    setUser((prevUser) => {
      return {
        ...prevUser,
        ...user,
      }
    })
  }

  if (log) {
    console.log(user)
  }

  return user
}

//
export const tokensHandler = (
  user: userType,
  tokens?: string[],
  setUser?: React.Dispatch<React.SetStateAction<userType>>,
): string => {
  if (!Array.isArray(tokens) || !tokens.length) {
    return user.token
  } else {
    if (setUser) {
      setUser((prevUser) => {
        return {
          ...prevUser,
          token: tokens[0],
        }
      })
    }

    localStorage.setItem("access_token", tokens[0])
    localStorage.setItem("refresh_token", tokens[1])

    return tokens[0]
  }
}
