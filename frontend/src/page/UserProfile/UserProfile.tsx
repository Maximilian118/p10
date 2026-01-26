import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_userProfile.scss'
import AppContext from "../../context"
import { userProfileType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getUserById } from "../../shared/requests/userRequests"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import BadgeChampPicker from "../../components/utility/badgeChampPicker/BadgeChampPicker"

// Displays the profile page for a specific user (read-only view).
const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [userProfile, setUserProfile] = useState<userProfileType | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Fetch user data when ID changes.
  useEffect(() => {
    if (id) {
      getUserById(id, setUserProfile, user, setUser, navigate, setLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  // Render user profile.
  if (!userProfile) {
    return (
      <div className="content-container">
        <p>User not found</p>
      </div>
    )
  }

  return (
    <div className="content-container">
      <ProfileCard user={userProfile} readOnly/>
      <BadgeChampPicker
        user={userProfile}
        selectionMode={{ active: false, targetSlot: null }}
        onBadgeSelect={() => {}}
        onBadgeRemove={() => {}}
      />
    </div>
  )
}

export default UserProfile
