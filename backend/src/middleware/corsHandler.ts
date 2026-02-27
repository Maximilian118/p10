import { RequestHandler } from "express"

// Allowed origins for CORS. In production, restricts to the frontend domain.
// In development (no FRONTEND_URL set), allows all origins.
const allowedOrigin = process.env.FRONTEND_URL || "*"

const corsHandler: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin
  // Set the allowed origin header. When restricted, only allow the configured frontend URL.
  if (allowedOrigin === "*" || origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*")
  }
  res.setHeader("Access-Control-Allow-Methods", "POST")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, accessToken, refreshToken") // prettier-ignore
  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }

  next()
}

export default corsHandler
