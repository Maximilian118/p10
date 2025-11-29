import React, { useEffect, useState } from "react"
import { userType } from "../../../shared/localStorage"
import { getInitials } from "../../../shared/utility"
import './_userIcon.scss'
import { useNavigate } from "react-router-dom"

interface userIconType {
  user: userType,
  style?: object
}

const UserIcon: React.FC<userIconType> = ({ user, style }) => {
  const [ error, setError ] = useState<boolean>(false)
  const [ userIcon, setUserIcon ] = useState<string>(user.icon)

  const iconContent = (user: userType) => {
    if (user.icon && !error) {
      return <img alt="Icon" onError={() => setError(true)} src={user.icon}></img>
    } else {
      return <p>{getInitials(user.name)}</p>
    }
  }

  useEffect(() => {
    if (error && user.icon !== userIcon) {
      setError(false)
      setUserIcon(user.icon)
    }
  }, [user, userIcon, error])

  const navigate = useNavigate()

  return (
    <div className="user-icon" style={style} onClick={() => navigate("/profile")}>
      {iconContent(user)}
    </div>
  )
}

export default UserIcon
