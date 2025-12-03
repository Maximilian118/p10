import axios, { AxiosResponse } from "axios"
import { userType } from "../localStorage"
import { NavigateFunction } from "react-router-dom"
import { graphQLErrors, graphQLErrorType, graphQLResponse, headers } from "./requestsUtility"
import { champType } from "../types"
import { uplaodS3 } from "./bucketRequests"
import { createChampFormType } from "../../page/CreateChamp"

// Fetches all championships for the authenticated user.
export const getChamps = async (
  setChamps: React.Dispatch<React.SetStateAction<champType[]>>,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<void> => {
  setLoading(true)

  try {
    await axios
      .post(
        "",
        {
          variables: {},
          query: `
            query {
              getChamps {
                array {
                  _id
                  name
                  icon
                  profile_picture
                  season
                  created_at
                  updated_at
                  standings {
                    competitor {
                      _id
                      icon
                    }
                  }
                }
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("getChamps", res, setUser, navigate, setBackendErr, true)
        } else {
          const champs = graphQLResponse("getChamps", res, user, setUser) as {
            array: champType[]
            token: string
            code: number
          }

          if (champs.array.length > 0) {
            setChamps(champs.array)
          }
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("getChamps", err, setUser, navigate, setBackendErr, true)
      })
  } catch (err: unknown) {
    graphQLErrors("getChamps", err, setUser, navigate, setBackendErr, true)
  }

  setLoading(false)
}

// Creates a new championship with all form data
export const createChamp = async (
  form: createChampFormType,
  user: userType,
  setUser: React.Dispatch<React.SetStateAction<userType>>,
  navigate: NavigateFunction,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>,
): Promise<champType | null> => {
  setLoading(true)
  let iconURL = ""
  let profilePictureURL = ""

  // Upload icon to S3 if provided
  if (form.icon) {
    iconURL = await uplaodS3(
      form.champName,
      "icon",
      form.icon,
      setBackendErr,
      user,
      setUser,
      navigate,
    )

    if (!iconURL) {
      setLoading(false)
      return null
    }
  }

  // Upload profile picture to S3 if provided
  if (form.profile_picture) {
    profilePictureURL = await uplaodS3(
      form.champName,
      "profile-picture",
      form.profile_picture,
      setBackendErr,
      user,
      setUser,
      navigate,
    )

    if (!profilePictureURL) {
      setLoading(false)
      return null
    }
  }

  // Build badge input - full data for custom badges, just _id for defaults.
  const champBadges = form.champBadges.map((badge) => {
    if (badge.default) {
      // Default badge - reference by existing _id.
      return { _id: badge._id, isDefault: true }
    } else {
      // Custom badge - send full data for backend to create.
      return {
        url: badge.url,
        name: badge.name,
        rarity: badge.rarity,
        awardedHow: badge.awardedHow,
        awardedDesc: badge.awardedDesc,
        zoom: badge.zoom,
        isDefault: false,
      }
    }
  })

  // Build rules and regs list (strip out user info - backend will add it)
  const rulesAndRegsList = form.rulesAndRegs.list.map((rule) => ({
    text: rule.text,
    subsections:
      rule.subsections?.map((sub) => ({
        text: sub.text,
      })) || [],
  }))

  // Generate rounds array from the number of rounds specified in form
  const roundCount = typeof form.rounds === "string" ? parseInt(form.rounds) : form.rounds
  const roundsArray = Array.from({ length: roundCount }, (_, i) => ({
    round: i + 1,
    completed: false,
  }))

  try {
    let result: champType | null = null

    await axios
      .post(
        "",
        {
          variables: {
            name: form.champName,
            icon: iconURL,
            profile_picture: profilePictureURL,
            rounds: roundsArray,
            driverGroup: form.driverGroup?._id,
            maxCompetitors: form.driverGroup?.drivers?.length || 24,
            pointsStructure: form.pointsStructure,
            rulesAndRegs: {
              default: form.rulesAndRegs.default,
              list: rulesAndRegsList,
            },
            champBadges,
          },
          query: `
            mutation CreateChamp(
              $name: String!,
              $icon: String,
              $profile_picture: String,
              $rounds: [RoundInput!]!,
              $driverGroup: ID!,
              $maxCompetitors: Int,
              $pointsStructure: [PointsStructureInput!]!,
              $rulesAndRegs: RulesAndRegsInput!,
              $champBadges: [ChampBadgeInput!]!
            ) {
              createChamp(champInput: {
                name: $name,
                icon: $icon,
                profile_picture: $profile_picture,
                rounds: $rounds,
                driverGroup: $driverGroup,
                maxCompetitors: $maxCompetitors,
                pointsStructure: $pointsStructure,
                rulesAndRegs: $rulesAndRegs,
                champBadges: $champBadges
              }) {
                _id
                name
                icon
                profile_picture
                season
                created_at
                updated_at
                tokens
              }
            }
          `,
        },
        { headers: headers(user.token) },
      )
      .then((res: AxiosResponse) => {
        if (res.data.errors) {
          graphQLErrors("createChamp", res, setUser, navigate, setBackendErr, true)
        } else {
          const champ = graphQLResponse("createChamp", res, user, setUser, false) as champType
          result = champ
        }
      })
      .catch((err: unknown) => {
        graphQLErrors("createChamp", err, setUser, navigate, setBackendErr, true)
      })

    setLoading(false)
    return result
  } catch (err: unknown) {
    graphQLErrors("createChamp", err, setUser, navigate, setBackendErr, true)
    setLoading(false)
    return null
  }
}
