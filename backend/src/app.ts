import "dotenv/config"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { graphqlHTTP } from "express-graphql"
import mongoose from "mongoose"
import { formatErrHandler } from "./shared/utility"

// Import Graphql Schema and Resolvers.
import Schema from "./graphql/schemas/schemas"
import Resolvers from "./graphql/resolvers/resolvers"

// Import middleware.
import corsHandler from "./middleware/corsHandler"
import auth from "./middleware/auth"

// Import socket handler.
import { initializeSocket } from "./socket/socketHandler"

// Initialise express.
const app = express()

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

// Make token authentication middleware available in all resolvers by passing req.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(auth as any)

// Initialise GraphQL.
// Function takes a method to shape errors.
app.use("/graphql", (req, res) => {
  graphqlHTTP({
    schema: Schema,
    rootValue: Resolvers,
    graphiql: true,
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
    httpServer.listen(Number(PORT), HOST, () => console.log(`✓ Server started on ${HOST}:${PORT}`))
  })
  .catch((err: unknown) => {
    console.log(`✗ Failed to connect to ${connectionType}`)
    console.log("  Error:", err instanceof Error ? err.message : err)
  })
