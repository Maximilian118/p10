import axios from "axios"
import { createLogger } from "../../shared/logger"

const log = createLogger("OpenF1")

const OPENF1_TOKEN_URL = "https://api.openf1.org/token"

// In-memory token cache.
let cachedToken: string | null = null
let tokenExpiresAt = 0

// Fetches an OAuth2 access token from the OpenF1 API.
// Caches the token in memory for 55 minutes (tokens expire at 60min).
export const getOpenF1Token = async (): Promise<string> => {
  const now = Date.now()

  // Return cached token if still valid (with 5-minute buffer).
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken
  }

  const username = process.env.OPENF1_USERNAME
  const password = process.env.OPENF1_PASSWORD

  if (!username || !password) {
    throw new Error("OpenF1 credentials not configured (OPENF1_USERNAME / OPENF1_PASSWORD)")
  }

  // POST form-urlencoded credentials to get a bearer token.
  const params = new URLSearchParams()
  params.append("username", username)
  params.append("password", password)

  const response = await axios.post(OPENF1_TOKEN_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })

  const { access_token, expires_in } = response.data

  if (!access_token) {
    throw new Error("OpenF1 token response missing access_token")
  }

  // Cache with a 55-minute TTL (5-minute buffer before actual expiry).
  cachedToken = access_token
  const expiresInMs = (parseInt(expires_in, 10) || 3600) * 1000
  tokenExpiresAt = now + expiresInMs - 5 * 60 * 1000

  log.info("✓ Token acquired (expires in ~55min)")
  return cachedToken as string
}

// Clears the cached token (forces re-fetch on next request).
export const clearOpenF1Token = (): void => {
  cachedToken = null
  tokenExpiresAt = 0
}
