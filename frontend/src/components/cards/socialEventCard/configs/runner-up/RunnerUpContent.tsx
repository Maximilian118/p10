import React from "react"
import "./_runner-up.scss"
import ShowcaseContent from "../showcase/ShowcaseContent"
import { ContentProps } from "../types"

// Runner-up layout — wraps shared ShowcaseContent with silver theme.
const RunnerUpContent: React.FC<ContentProps> = (props) => <ShowcaseContent {...props} />

export default RunnerUpContent
