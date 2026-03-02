import React from "react"
import "./_streak.scss"
import ShowcaseContent from "../showcase/ShowcaseContent"
import { ContentProps } from "../types"

// Streak layout — wraps shared ShowcaseContent with fiery amber theme.
const StreakContent: React.FC<ContentProps> = (props) => <ShowcaseContent {...props} />

export default StreakContent
