import React, { useEffect, useState } from "react"
import { userType } from "../../../../shared/localStorage"
import { getInitials } from "../../../../shared/utility"
import './_userIcon.scss'
import { useNavigate } from "react-router-dom"
import ImageError from "../utility/imageError/ImageError"
import { shouldShowImageError } from "../utility/iconUtility"

interface userIconType {
  user: userType,
  style?: object
}

const UserIcon: React.FC<userIconType> = ({ user, style }) => {
  const [ error, setError ] = useState<boolean>(false)
  const [ userIcon, setUserIcon ] = useState<string>(user.icon)

  // Renders image or initials fallback if image cannot be displayed.
  const iconContent = (user: userType) => {
    if (shouldShowImageError(user.icon, error)) {
      return <ImageError content={getInitials(user.name)} />
    }
    return <img alt="Icon" onError={() => setError(true)} src={user.icon}></img>
  }

  // Reset error state when user icon changes.
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
