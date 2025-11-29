import React from "react"
import './_formElContainer.scss'
import { TextField } from "@mui/material"
import { inputLabel } from "../../../shared/formValidation"
import { formErrType } from "../../../shared/types"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"

interface formElContainerType {
  name: string
  content: JSX.Element
  formErr: formErrType
  backendErr: graphQLErrorType
}

const FormElContainer = ({ name, content, formErr, backendErr }: formElContainerType) => {
  const error = formErr[name] || backendErr.type === name ? true : false

  return (
    <div className={`form-el-container ${error ? "mui-error" : ""}`}>
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
