import React from "react"
import "./_victory.scss"
import ShowcaseContent from "../showcase/ShowcaseContent"
import { ContentProps } from "../types"

// Victory layout — wraps shared ShowcaseContent with victory theme.
const VictoryContent: React.FC<ContentProps> = (props) => <ShowcaseContent {...props} />

export default VictoryContent
