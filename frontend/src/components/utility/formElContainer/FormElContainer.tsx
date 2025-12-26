import React from "react"
import './_formElContainer.scss'
import { TextField } from "@mui/material"
import { inputLabel } from "../../../shared/formValidation"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"

interface formElContainerType {
  name: string
  content: JSX.Element
  formErr: { [key: string]: string | undefined | number }
  backendErr: graphQLErrorType
  onClick?: () => void
  disabled?: boolean
}

const FormElContainer = ({ name, content, formErr, backendErr, onClick, disabled }: formElContainerType) => {
  const error = formErr[name] || backendErr.type === name ? true : false
  const isClickable = onClick && !disabled

  // Handle click event for clickable containers.
  const handleClick = () => {
    if (isClickable) {
      onClick()
    }
  }

  return (
    <div
      className={`form-el-container ${error ? "mui-error" : ""} ${isClickable ? "clickable" : ""} ${disabled ? "disabled" : ""}`}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="mui-background-wrapper">
        <TextField
          className="mui-background"
          focused={true}
          name={name}
          label={inputLabel(name, formErr, backendErr)}
          variant="filled"
          multiline={true}
          rows={40}
          error={error}
        />
      </div>
      {content}
    </div>
  )
}

export default FormElContainer
