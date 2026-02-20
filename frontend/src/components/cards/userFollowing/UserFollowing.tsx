import React from "react"
import "./_userFollowing.scss"
import IconList from "../../utility/iconList/IconList"
import { useNavigate } from "react-router-dom"
import { CircularProgress } from "@mui/material"

interface FollowingIconItem {
  _id: string
  icon: string
}

interface UserFollowingProps {
  followingUsers: FollowingIconItem[]
  onExpand: () => void
  loading?: boolean
}

// Compact "Following:" row showing user icons via IconList.
// Clicking an icon navigates to that user's profile; clicking elsewhere expands the detail view.
const UserFollowing: React.FC<UserFollowingProps> = ({ followingUsers, onExpand, loading }) => {
  const navigate = useNavigate()

  // Show spinner while following data is loading.
  if (loading) {
    return (
      <div className="user-following-row user-following-row--empty">
        <CircularProgress size={18} />
      </div>
    )
  }

  // Render static row when user follows nobody.
  if (!followingUsers.length) {
    return (
      <div className="user-following-row user-following-row--empty">
        <span className="following-label">Following nobody...</span>
      </div>
    )
  }

  // Navigate to the clicked user's profile.
  const handleIconClick = (item: FollowingIconItem) => {
    navigate(`/profile/${item._id}`)
  }

  return (
    <div className="user-following-row" onClick={onExpand}>
      <span className="following-label">Following:</span>
      <div className="following-icons">
        <IconList
          items={followingUsers}
          onItemClick={handleIconClick}
        />
      </div>
    </div>
  )
}

export default UserFollowing
