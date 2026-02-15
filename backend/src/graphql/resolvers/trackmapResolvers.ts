import Trackmap from "../../models/trackmap"
import User from "../../models/user"
import { getActiveTrackName, setTrackmapRotation } from "../../services/openF1/sessionManager"
import { AuthRequest } from "../../middleware/auth"

// Resolver arguments for the getTrackmap query.
export interface GetTrackmapArgs {
  trackName?: string
}

// Resolver arguments for the setTrackmapRotation mutation.
export interface SetTrackmapRotationArgs {
  trackName: string
  rotation: number
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

  // Updates the rotation override for a trackmap. Admin-only — saves to DB and
  // broadcasts the updated trackmap to all connected clients via Socket.IO.
  setTrackmapRotation: async ({ trackName, rotation }: SetTrackmapRotationArgs, req: AuthRequest) => {
    if (!req.isAuth) throw new Error("Not authenticated")

    const user = await User.findById(req._id)
    if (!user?.permissions?.admin) throw new Error("Admin access required")

    return await setTrackmapRotation(trackName, rotation)
  },
}

export default trackmapResolvers
