import "dotenv/config"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { graphqlHTTP } from "express-graphql"
import mongoose from "mongoose"
import helmet from "helmet"
import depthLimit from "graphql-depth-limit"
import { formatErrHandler } from "./shared/utility"

// Import Graphql Schema and Resolvers.
import Schema from "./graphql/schemas/schemas"
import Resolvers from "./graphql/resolvers/resolvers"

// Import middleware.
import corsHandler from "./middleware/corsHandler"
import auth from "./middleware/auth"
import { apiLimiter } from "./middleware/rateLimit"

// Import socket handler and auto-transition recovery.
import { initializeSocket } from "./socket/socketHandler"
import { recoverStuckRounds } from "./socket/autoTransitions"

// Initialise express.
const app = express()

// Security: Remove X-Powered-By header to hide server technology.
app.disable("x-powered-by")

// Security: Add helmet middleware for various HTTP security headers.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://*.amazonaws.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)

// Create HTTP server wrapping Express for Socket.io integration.
const httpServer = createServer(app)

// Initialize Socket.io with CORS configuration.
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Export io instance for use in resolvers.
export { io }

// Initialize socket event handlers and authentication.
initializeSocket(io)

// Maximum request body size.
app.use(express.json({ limit: "1mb" }))

// Handle CORS Errors.
app.use(corsHandler)

// Security: Apply rate limiting to GraphQL endpoint.
app.use("/graphql", apiLimiter)

// Make token authentication middleware available in all resolvers by passing req.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(auth as any)

// Check if running in production mode.
const isProduction = process.env.NODE_ENV === "production"

// Initialise GraphQL with security validation rules.
app.use("/graphql", (req, res) => {
  graphqlHTTP({
    schema: Schema,
    rootValue: Resolvers,
    graphiql: !isProduction, // Disable GraphiQL in production.
    validationRules: [depthLimit(10)], // Prevent deeply nested queries (DoS protection).
    customFormatErrorFn(error) {
      return formatErrHandler(error)
    },
  })(req, res)
})

// MongoDB connection URI from environment variable, with local fallback for development.
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/p10_game"

// Determine connection type for logging.
const isAtlas = MONGODB_URI.includes("mongodb.net") || MONGODB_URI.includes("mongodb+srv")
const connectionType = isAtlas ? "MongoDB Atlas" : "Local MongoDB"

// Connect to MongoDB and start the server.
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`✓ Connected to ${connectionType}`)
    const PORT = process.env.PORT || 3001
    const HOST = process.env.HOST || "localhost"
    // Use httpServer.listen instead of app.listen for Socket.io support.
    httpServer.listen(Number(PORT), HOST, () => {
      console.log(`✓ Server started on ${HOST}:${PORT}`)
      // Recover any rounds stuck in timed statuses from before the restart.
      recoverStuckRounds(io)
    })
  })
  .catch((err: unknown) => {
    console.log(`✗ Failed to connect to ${connectionType}`)
    console.log("  Error:", err instanceof Error ? err.message : err)
  })
