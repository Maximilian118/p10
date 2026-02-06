import axios from "axios"
import { getApiUrl } from "../../../shared/utility"
import { graphQLResponse, graphQLErrors, headers } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"

// Response type for demo mutations.
interface DemoStatus {
  active: boolean
  sessionKey: number | null
  trackName: string
  speed: number
}

// Starts a demo replay of a historical F1 session.
export const startDemo = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  sessionKey?: number,
  speed?: number,
): Promise<DemoStatus | null> => {
  try {
    const args: string[] = []
    if (sessionKey) args.push(`sessionKey: ${sessionKey}`)
    if (speed) args.push(`speed: ${speed}`)
    const argsStr = args.length > 0 ? `(${args.join(", ")})` : ""

    const res = await axios.post(
      `${getApiUrl()}/graphql`,
      {
        query: `mutation {
          startDemo${argsStr} {
            active
            sessionKey
            trackName
            speed
          }
        }`,
      },
      { headers: headers(user.token) },
    )

    const data = graphQLResponse("startDemo", res, user, setUser) as DemoStatus | null
    return data
  } catch (err) {
    graphQLErrors("startDemo", err, undefined, undefined, undefined, true)
    return null
  }
}

// Stops the current demo replay.
export const stopDemo = async (
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
): Promise<DemoStatus | null> => {
  try {
    const res = await axios.post(
      `${getApiUrl()}/graphql`,
      {
        query: `mutation {
          stopDemo {
            active
            sessionKey
            trackName
            speed
          }
        }`,
      },
      { headers: headers(user.token) },
    )

    const data = graphQLResponse("stopDemo", res, user, setUser) as DemoStatus | null
    return data
  } catch (err) {
    graphQLErrors("stopDemo", err, undefined, undefined, undefined, true)
    return null
  }
}
