import React from "react"
import { CircularProgress } from "@mui/material"
import "./_fillLoading.scss"

// Displays a centered loading spinner that fills its parent container.
const FillLoading: React.FC = () => {
  return (
    <div className="fill-loading">
      <CircularProgress/>
    </div>
  )
}

export default FillLoading
