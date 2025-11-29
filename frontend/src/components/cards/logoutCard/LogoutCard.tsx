import React from "react"
import "./_logoutCard.scss"
import { logout, userType } from "../../../shared/localStorage"
import { Button } from "@mui/material"
import { useNavigate } from "react-router-dom"

interface logoutCardType {
  setUser: React.Dispatch<React.SetStateAction<userType>>
}

const LogoutCard: React.FC<logoutCardType> = ({ setUser }) => {
  const navigate = useNavigate()
  
  return (
    <div className="logout-card">
      <Button
        variant="contained" 
        type="submit"
        className="mui-form-btn"
        style={{ margin: 0 }}
        onClick={() => logout(setUser, navigate)}
      >Logout</Button>
    </div>
  )
}

export default LogoutCard
