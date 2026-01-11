import { Button, CircularProgress, TextField } from "@mui/material"
import React, { useContext, useState } from "react"
import { inputLabel, updateForm } from "../shared/formValidation"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { updatePassword } from "../shared/requests/userRequests"
import AppContext from "../context"
import { useNavigate } from "react-router-dom"

export interface passFormType {
  currentPass: string
  password: string
  passConfirm: string
  [key: string]: string
}

const initPassForm = {
  currentPass: "",
  password: "",
  passConfirm: "",
}

const Password: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ success, setSuccess ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ form, setForm ] = useState<passFormType>(initPassForm)
  const [ formErr, setFormErr ] = useState<passFormType>(initPassForm)

  const navigate = useNavigate()

  const updatePassHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccess(false)
    await updatePassword(form, user, setUser, setLoading, setBackendErr, setSuccess, navigate)
  }

  return (
    <form 
      className="content-container" 
      style={{ background: "white" }}
      onSubmit={e => updatePassHandler(e)}
    >
      <TextField
        required={!formErr.currentPass}
        type="password"
        className="mui-form-el"
        style={{ marginTop: 40 }}
        name="currentPass"
        label={inputLabel("currentPass", formErr, backendErr)} 
        variant="filled"
        onChange={e => updateForm<passFormType, passFormType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.currentPass}
        error={formErr.currentPass || backendErr.type === "currentPass" ? true : false}
      />
      <TextField
        required={!formErr.newPass}
        inputProps={{ maxLength: 99 }}
        type="password"
        className="mui-form-el"
        name="password"
        label={inputLabel("password", formErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<passFormType, passFormType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.password}
        error={formErr.password || backendErr.type === "password" ? true : false}
      />
      <TextField
        required={!formErr.newPass}
        type="password"
        className="mui-form-el"
        name="passConfirm" 
        label={inputLabel("passConfirm", formErr, backendErr)} 
        variant="filled"
        onChange={e => updateForm<passFormType, passFormType>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        value={form.passConfirm}
        error={formErr.passConfirm || backendErr.type === "passConfirm" ? true : false}
      />
      <Button
        variant="contained" 
        type="submit"
        style={{ margin: "20px 0 40px 0" }}
        startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
        color={success ? "success" : "primary"}
      >{success? "Password Changed" : "Change Password"}</Button>
    </form>
  )
}

export default Password
