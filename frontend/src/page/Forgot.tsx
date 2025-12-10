import React, { useState } from "react"
import { TextField, Button, CircularProgress } from "@mui/material"
import { inputLabel, updateForm } from '../shared/formValidation'
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { forgot } from "../shared/requests/userRequests"
import { useNavigate } from "react-router-dom"

export interface forgotFormType {
  email: string,
  [key: string]: string
}

const Forgot: React.FC = () => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ success, setSuccess ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ form, setForm ] = useState<forgotFormType>({
    email: "",
  })
  const [ formErr, setFormErr ] = useState<forgotFormType>({
    email: "",
  })

  const onSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    forgot(form, setLoading, setBackendErr, setSuccess)
  }

  const navigate = useNavigate()

  return (
    <div className="content-container">
      <div className="form-container">
        <img 
          src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-engine3.jpeg"
          alt="An old Formula 1 car." 
          className="form-background"
          style={{ 
            maskImage: "linear-gradient(to bottom, rgba(0, 0, 0, 1.0) 50%, transparent 100%)", 
            left: -40,
            opacity: success ? 0 : 0.7 
          }}
        />
        <div className="form-title" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 10 }}>Forgot</h2>
          <h2 className="clickable" onClick={() => navigate(-1)}>Back</h2>
        </div>
        {success ? 
        <div className="form-notification">
          <p>{`If an account has been found an email has been sent to ${form.email}.`}</p>
          <p>Please follow the password reset instructions there. </p>
          <p>Don't forget to check your Junk folder!</p>
        </div>
        :
        <form onSubmit={e => onSubmitHandler(e)}>
        <TextField
            required={!formErr.email && backendErr.type !== "email"}
            className="mui-form-el"
            name="email"
            label={inputLabel("email", formErr, backendErr)}
            variant="filled" 
            onChange={e => updateForm<forgotFormType, forgotFormType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
            value={form.email}
            error={formErr.email || backendErr.type === "email" ? true : false}
          />
          <Button 
            variant="contained" 
            type="submit"
            className="mui-form-btn"
            startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
          >Submit</Button>
        </form>}
        <div style={{ height: "10%" }}></div>
      </div>
    </div>
  )
}

export default Forgot
