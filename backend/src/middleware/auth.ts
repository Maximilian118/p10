import jwt, { JwtPayload } from "jsonwebtoken"
import User from "../models/user"
import { signTokens } from "../shared/utility"
import { Request, Response, NextFunction } from "express"

export interface AuthRequest extends Request {
  tokens: string[]
  _id?: string
  isAuth?: boolean
}

const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const accessTokenHeader = req.get("accessToken")
  const refreshTokenHeader = req.get("refreshToken")
  req.isAuth = false
  req.tokens = []

  if (!accessTokenHeader && !refreshTokenHeader) {
    return next()
  }

  const accessToken = accessTokenHeader && accessTokenHeader.split(" ")[1]
  if (!accessToken || accessToken === "") {
    res.status(401)
    return next()
  }

  try {
    const verifiedToken = jwt.verify(accessToken, `${process.env.ACCESS_TOKEN_SECRET}`)

    if (typeof verifiedToken === "string") {
      console.error("Error: Invalid accessToken")
      res.status(401)
      return next()
    }

    req.isAuth = true
    req._id = verifiedToken._id
    res.status(200)
    return next()
  } catch {}

  if (!refreshTokenHeader) {
    res.status(401)
    return next()
  }

  const refreshToken = refreshTokenHeader.split(" ")[1]
  if (!refreshToken || refreshToken === "") {
    res.status(401)
    return next()
  }

  let verifiedRefreshToken: string | JwtPayload = {}

  try {
    verifiedRefreshToken = jwt.verify(refreshToken, `${process.env.REFRESH_TOKEN_SECRET}`)
  } catch {
    res.status(401)
    return next()
  }

  if (typeof verifiedRefreshToken === "string") {
    console.error("Error: Invalid refreshToken")
    res.status(401)
    return next()
  }

  const user = await User.findOne({ _id: verifiedRefreshToken._id })
  if (!user || user.refresh_count !== verifiedRefreshToken.refresh_count) {
    res.status(401)
    return next()
  }

  req.tokens = signTokens(user)
  req.isAuth = true
  req._id = verifiedRefreshToken._id
  res.status(200)
  next()
}

export default auth
