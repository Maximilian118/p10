import Trackmap from "../../models/trackmap"
import { getActiveTrackName } from "../../services/openF1/sessionManager"

// Resolver arguments for the getTrackmap query.
export interface GetTrackmapArgs {
  trackName?: string
}

const trackmapResolvers = {
  // Retrieves a stored track map by name, or for the currently active session.
  // If trackName is provided, looks up directly. Otherwise, uses the active session's track.
  getTrackmap: async ({ trackName }: GetTrackmapArgs) => {
    const name = trackName || getActiveTrackName()

    if (!name) {
      return null
    }

    const trackmap = await Trackmap.findOne({ trackName: name })
    return trackmap || null
  },
}

export default trackmapResolvers
