import React from "react"
import "./_champion.scss"
import ShowcaseContent from "../showcase/ShowcaseContent"
import { ContentProps } from "../types"

// Champion layout — wraps shared ShowcaseContent with gold theme.
const ChampionContent: React.FC<ContentProps> = (props) => <ShowcaseContent {...props} />

export default ChampionContent
