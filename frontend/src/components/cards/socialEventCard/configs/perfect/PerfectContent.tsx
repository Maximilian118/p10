import React from "react"
import "./_perfect.scss"
import ShowcaseContent from "../showcase/ShowcaseContent"
import { ContentProps } from "../types"

// Perfect bet layout — wraps shared ShowcaseContent with crimson theme.
const PerfectContent: React.FC<ContentProps> = (props) => <ShowcaseContent {...props} />

export default PerfectContent
