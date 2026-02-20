import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import './_userProfile.scss'
import AppContext from "../../context"
import { userProfileType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getUserById, followUser, getFollowing, UserBasicType } from "../../shared/requests/userRequests"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import BadgeChampPicker from "../../components/utility/badgeChampPicker/BadgeChampPicker"
import UserFollowing from "../../components/cards/userFollowing/UserFollowing"
import FollowingDetail from "../../components/cards/userFollowing/FollowingDetail"
import { Button } from "@mui/material"
import PersonAddIcon from "@mui/icons-material/PersonAdd"

// Displays the profile page for a specific user (read-only view).
const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [userProfile, setUserProfile] = useState<userProfileType | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [followLoading, setFollowLoading] = useState<boolean>(false)
  const [followingUsers, setFollowingUsers] = useState<UserBasicType[]>([])
  const [followingLoading, setFollowingLoading] = useState<boolean>(false)
  const [showFollowingDetail, setShowFollowingDetail] = useState<boolean>(false)

  // Whether the authenticated user is already following this profile.
  const isFollowing = user.following?.includes(userProfile?._id ?? "")
  // Only show follow button on other users' profiles.
  const isOwnProfile = user._id === id

  // Reset following state when navigating to a different profile.
  useEffect(() => {
    setShowFollowingDetail(false)
    setFollowingUsers([])
    setFollowingLoading(false)
  }, [id])

  // Fetch user data when ID changes.
  useEffect(() => {
    if (id) {
      getUserById(id, setUserProfile, user, setUser, navigate, setLoading, setBackendErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Fetch following user icons in parallel with profile data.
  useEffect(() => {
    if (id) {
      getFollowing(setFollowingUsers, user, setUser, navigate, setFollowingLoading, setBackendErr, id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Handle follow button click — immediately sends request, button disappears when context updates.
  const handleFollow = async () => {
    if (!userProfile) return
    setFollowLoading(true)
    await followUser(userProfile._id, user, setUser, navigate, setBackendErr)
    setFollowLoading(false)
  }

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

      {/* Compact following row — always rendered to prevent layout shift. */}
      {!showFollowingDetail && (
        <UserFollowing
          followingUsers={followingUsers}
          onExpand={() => setShowFollowingDetail(true)}
          loading={followingLoading}
        />
      )}

      {/* Follow button - shown only on other users' profiles when not already following. */}
      {!isOwnProfile && !isFollowing && (
        <Button
          className="follow-button"
          variant="contained"
          fullWidth
          startIcon={<PersonAddIcon />}
          onClick={handleFollow}
          disabled={followLoading}
        >
          Follow {userProfile.name}
        </Button>
      )}

      {/* Expanded following detail replaces BadgeChampPicker when active. */}
      {showFollowingDetail ? (
        <FollowingDetail
          userId={userProfile._id}
          onClose={() => setShowFollowingDetail(false)}
        />
      ) : (
        <BadgeChampPicker
          user={userProfile}
          selectionMode={{ active: false, targetSlot: null }}
          onBadgeSelect={() => {}}
          onBadgeRemove={() => {}}
        />
      )}
    </div>
  )
}

export default UserProfile
