import "dotenv/config"
import express from "express"
import { graphqlHTTP } from "express-graphql"
import mongoose from "mongoose"
import { formatErrHandler } from "./shared/utility"

// Import Graphql Schema and Resolvers.
import Schema from "./graphql/schemas/schemas"
import Resolvers from "./graphql/resolvers/resolvers"

// Import middleware.
import corsHandler from "./middleware/corsHandler"
import auth from "./middleware/auth"

// Initialise express.
const app = express()

// Maximum request body size.
app.use(express.json({ limit: "1mb" }))

// Handle CORS Errors.
app.use(corsHandler)

// Make token authentication middleware available in all reducers by passing req.
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
    app.listen(PORT, () => console.log(`✓ Server started on port ${PORT}`))
  })
  .catch((err: unknown) => {
    console.log(`✗ Failed to connect to ${connectionType}`)
    console.log("  Error:", err instanceof Error ? err.message : err)
  })
