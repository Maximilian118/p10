import { createContext } from "react"
import { checkUserLS, userType } from "./shared/localStorage"

export interface AppContextType {
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const AppContext = createContext<AppContextType>({
  user: checkUserLS(),
  setUser: () => {},
  loading: false,
  setLoading: () => false,
})

export default AppContext
