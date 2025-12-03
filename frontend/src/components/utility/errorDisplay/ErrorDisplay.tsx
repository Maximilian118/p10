import React from "react"
import { Error } from "@mui/icons-material"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import "./_errorDisplay.scss"

interface ErrorDisplayProps {
  backendErr?: graphQLErrorType
}

// Displays an error message with an error icon.
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ backendErr }) => {
  if (!backendErr?.message) return null

  return (
    <div className="error-display-container">
      <div className="error-display-title">
        <h4>Error</h4>
        <Error/>
      </div>
      <p>{backendErr.message}</p>
    </div>
  )
}

export default ErrorDisplay
