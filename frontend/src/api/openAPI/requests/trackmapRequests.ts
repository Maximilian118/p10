import axios from "axios"
import { getApiUrl } from "../../../shared/utility"
import { graphQLResponse, graphQLErrors, headers } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"
import { TrackmapData } from "../types"

// Fetches a stored track map from the backend via GraphQL.
// If trackName is omitted, returns the track map for the currently active session.
export const getTrackmap = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  trackName?: string,
): Promise<TrackmapData | null> => {
  try {
    const trackNameArg = trackName ? `(trackName: "${trackName}")` : ""

    const res = await axios.post(
      `${getApiUrl()}/graphql`,
      {
        query: `{
          getTrackmap${trackNameArg} {
            trackName
            path { x y }
            pathVersion
            totalLapsProcessed
            updated_at
          }
        }`,
      },
      { headers: headers(user.token) },
    )

    const data = graphQLResponse("getTrackmap", res, user, setUser) as TrackmapData | null
    return data
  } catch (err) {
    graphQLErrors("getTrackmap", err)
    return null
  }
}
