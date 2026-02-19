import React from "react"
import { CircularProgress } from "@mui/material"
import "./_fillLoading.scss"

interface FillLoadingProps {
  text?: string // Optional text below the spinner
}

// Displays a centered loading spinner that fills its parent container.
const FillLoading: React.FC<FillLoadingProps> = ({ text }) => {
  return (
    <div className="fill-loading">
      <CircularProgress size={60}/>
      {text && <p>{text}</p>}
    </div>
  )
}

export default FillLoading
