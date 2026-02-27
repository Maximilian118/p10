import { RequestHandler } from "express"

// Allowed origins for CORS. Supports comma-separated list for multiple origins.
// In development (no FRONTEND_URL set), allows all origins.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["*"]

const corsHandler: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin
  // Set the allowed origin header. When restricted, only allow configured frontend URLs.
  if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
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
