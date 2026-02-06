// GraphQL schema for demo mode replay control.
const demoSchema = `
  type DemoStatus {
    active: Boolean!
    sessionKey: Int
    trackName: String
    speed: Int
  }
`

export default demoSchema
