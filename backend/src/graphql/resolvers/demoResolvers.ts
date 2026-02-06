import { startDemoReplay, stopDemoReplay } from "../../services/openF1/demoReplay"

// Resolver arguments for the startDemo mutation.
export interface StartDemoArgs {
  sessionKey?: number
  speed?: number
}

const demoResolvers = {
  // Starts a demo replay of a historical F1 session.
  startDemo: async ({ sessionKey, speed }: StartDemoArgs) => {
    return await startDemoReplay(sessionKey, speed)
  },

  // Stops the current demo replay.
  stopDemo: () => {
    return stopDemoReplay()
  },
}

export default demoResolvers
