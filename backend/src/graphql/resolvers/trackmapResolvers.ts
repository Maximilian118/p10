import Trackmap from "../../models/trackmap"
import { getActiveTrackName } from "../../services/openF1/sessionManager"

// Resolver arguments for the getTrackmap query.
export interface GetTrackmapArgs {
  trackName?: string
}

const trackmapResolvers = {
  // Retrieves a stored track map by name, or for the currently active session.
  // If trackName is provided, looks up directly. Otherwise, uses the active session's track.
  // Prefers the cached MultiViewer outline over the GPS-derived path for display.
  getTrackmap: async ({ trackName }: GetTrackmapArgs) => {
    const name = trackName || getActiveTrackName()
    if (!name) return null

    const trackmap = await Trackmap.findOne({ trackName: name })
    if (!trackmap) return null

    // Prefer MultiViewer outline over GPS-derived path for display.
    if (trackmap.multiviewerPath && trackmap.multiviewerPath.length > 0) {
      return { ...trackmap.toObject(), path: trackmap.multiviewerPath }
    }
    return trackmap
  },
}

export default trackmapResolvers
