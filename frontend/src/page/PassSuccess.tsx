import { Button } from "@mui/material"
import React from "react"
import { useNavigate } from "react-router-dom"

const PassSuccess: React.FC = props => {
  const navigate = useNavigate()

  return (
    <div className="content-container" style={{ background: "white" }}>
      <div className="form-container">
        <div className="form-title">
          <h2 style={{ marginBottom: 40 }}>Password Changed</h2>
        </div>
        <div className="form-notification">
          <p>You have successfuly changed your password.</p>
          <p>Please login again.</p>
        </div>
        <Button
            variant="contained" 
            type="submit"
            style={{ margin: "20px 0" }}
            onClick={() => navigate("/login")}
          >Login</Button>
      </div>
    </div>
  )
}

export default PassSuccess
