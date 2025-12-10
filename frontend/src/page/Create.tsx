import React, { useContext, useState } from "react"
import { TextField, Button, CircularProgress } from "@mui/material"
import { updateForm, inputLabel } from '../shared/formValidation'
import DropZone from "../components/utility/dropZone/DropZone"
import { createUser } from "../shared/requests/userRequests"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { NavigateFunction, useNavigate } from "react-router-dom"
import AppContext from "../context"

interface createFormBaseType {
  name: string
  email: string
  password: string
  passConfirm: string
}

export interface createFormType extends createFormBaseType {
  icon: File | string | null
  profile_picture: File | string | null
}

export interface createFormErrType extends createFormBaseType {
  dropzone: string
  [key: string]: string
}

const Create: React.FC = () => {
  const { setUser } = useContext(AppContext)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ form, setForm ] = useState<createFormType>({
    name: "",
    email: "",
    password: "",
    passConfirm: "",
    icon: null,
    profile_picture: null,
  })
  const [ formErr, setFormErr ] = useState<createFormErrType>({
    name: "",
    email: "",
    password: "",
    passConfirm: "",
    dropzone: "",
  })

  const navigate = useNavigate()

  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>, navigate: NavigateFunction) => {
    e.preventDefault()
    createUser(form, setUser, setLoading, setBackendErr, navigate, setFormErr)
  }

  return (
    <div className="content-container">
      <div className="form-container">
        <img 
          src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-engine1.jpeg" 
          alt="An old Formula 1 car." 
          className="form-background" 
          style={{ width: "250%", top: 50, left: "-35%" }}
        />
        <div className="form-title" style={{ marginBottom: 10 }}>
          <h2 style={{ marginBottom: 10 }}>Create Account</h2>
          <h2 className="clickable" onClick={() => navigate(-1)}>Back</h2>
        </div>
        <form onSubmit={e => onSubmitHandler(e, navigate)}>
          <DropZone<createFormType, createFormErrType> 
            form={form}
            setForm={setForm} 
            setFormErr={setFormErr} 
            backendErr={backendErr}
            setBackendErr={setBackendErr}
            style={{ width: "60%" }}
          />
          <TextField
            required={!formErr.name && backendErr.type !== "name"}
            className="mui-form-el"
            inputProps={{ maxLength: 30 }}
            name="name"
            label={inputLabel("name", formErr, backendErr)}
            variant="filled" 
            onChange={e => updateForm<createFormType, createFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
            value={form.name}
            error={formErr.name || backendErr.type === "name" ? true : false}
          />
          <TextField
            required={!formErr.email && backendErr.type !== "email"}
            className="mui-form-el"
            name="email"
            label={inputLabel("email", formErr, backendErr)}
            variant="filled" 
            onChange={e => updateForm<createFormType, createFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
            value={form.email}
            error={formErr.email || backendErr.type === "email" ? true : false}
          />
          <TextField 
            required={!formErr.password && backendErr.type !== "password"}
            type="password"
            className="mui-form-el"
            inputProps={{ maxLength: 40 }}
            name="password" 
            label={inputLabel("password", formErr, backendErr)} 
            variant="filled"
            onChange={e => updateForm<createFormType, createFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
            value={form.password}
            error={formErr.password || backendErr.type === "password" ? true : false}
          />
          <TextField 
            required={!formErr.passConfirm && backendErr.type !== "passConfirm"}
            type="password"
            className="mui-form-el"
            inputProps={{ maxLength: 40 }}
            name="passConfirm" 
            label={inputLabel("passConfirm", formErr, backendErr)} 
            variant="filled"
            onChange={e => updateForm<createFormType, createFormErrType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
            value={form.passConfirm}
            error={formErr.passConfirm || backendErr.type === "passConfirm" ? true : false}
          />
          <Button 
            variant="contained" 
            type="submit"
            className="mui-form-btn"
            startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
          >Create Account</Button>
        </form>
      </div>
    </div>
  )
}

export default Create
