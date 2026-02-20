import rateLimit from "express-rate-limit"

// General API rate limiter - applies to all GraphQL requests.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
})

// Stricter limiter for authentication attempts (login, password reset).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
})
