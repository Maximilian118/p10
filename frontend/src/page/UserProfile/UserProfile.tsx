import React from "react"
import { useParams } from "react-router-dom"
import './_userProfile.scss'

// Displays the profile page for a specific user (read-only view).
const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="content-container">
      <p>User Profile ID: {id}</p>
    </div>
  )
}

export default UserProfile
