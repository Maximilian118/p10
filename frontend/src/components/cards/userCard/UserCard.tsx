import React from "react"
import './_userCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { Button, CircularProgress } from "@mui/material"

interface UserCardProps {
  name: string
  icon: string
  onClick?: () => void
  loading?: boolean
}

const UserCard: React.FC<UserCardProps> = ({ name, icon, loading, onClick }) => {
  return (
    <div className="user-card" onClick={onClick}>
      <ImageIcon src={icon} size="medium-large"/>
      <p className="competitor-name">{name}</p>
      {loading ? <CircularProgress size={30}/> : (
        <Button
          variant="contained"
          size="small"
          color="success"
          className="invite-button"
        >
          Invite
        </Button>
      )}
    </div>
  )
}

export default UserCard
