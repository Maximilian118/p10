import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowBack, Settings } from "@mui/icons-material"
import "./_profile.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import { formErrType, formType, SelectionModeState, userProfileType } from "../../shared/types"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import BadgeChampPicker from "../../components/utility/badgeChampPicker/BadgeChampPicker"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import { getUserById, getFollowing, UserBasicType } from "../../shared/requests/userRequests"
import { setFeaturedBadge } from "../../shared/requests/badgeRequests"
import UserFollowing from "../../components/cards/userFollowing/UserFollowing"
import FollowingDetail from "../../components/cards/userFollowing/FollowingDetail"

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)
  const [loading, setLoading] = useState<boolean>(true)
  const [userProfile, setUserProfile] = useState<userProfileType | null>(null)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [form, setForm] = useState<formType>({
    icon: null,
    profile_picture: null,
    name: user.name,
    email: user.email,
  })
  const [formErr, setFormErr] = useState<formErrType>({
    name: "",
    email: "",
    dropzone: "",
  })

  // Selection mode state for featuring badges.
  const [selectionMode, setSelectionMode] = useState<SelectionModeState>({
    active: false,
    targetSlot: null,
  })

  // Loading state for featured badge mutations (add/remove).
  const [featuredBadgeLoading, setFeaturedBadgeLoading] = useState<boolean>(false)

  // Following state: compact row icons and expanded detail toggle.
  const [followingUsers, setFollowingUsers] = useState<UserBasicType[]>([])
  const [followingLoading, setFollowingLoading] = useState<boolean>(false)
  const [showFollowingDetail, setShowFollowingDetail] = useState<boolean>(false)

  // Ref for badge picker area to detect clicks outside.
  const badgePickerRef = useRef<HTMLDivElement>(null)

  // Fetch full profile data on mount.
  useEffect(() => {
    getUserById(user._id, setUserProfile, user, setUser, navigate, setLoading, setBackendErr)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch basic following user data for the compact row icons.
  useEffect(() => {
    if (user.following?.length) {
      getFollowing(setFollowingUsers, user, setUser, navigate, setFollowingLoading, setBackendErr)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Merge enriched championships into user context when profile loads.
  useEffect(() => {
    if (userProfile) {
      setUser((prev) => ({
        ...prev,
        championships: userProfile.championships,
        badges: userProfile.badges,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile])

  // Click-outside handler to cancel selection mode.
  // Excludes clicks on badge slots (which should change the target slot, not cancel).
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const isSlotClick = target.closest('.badge-placeholder') || target.closest('.featured-slot')

      if (
        selectionMode.active &&
        badgePickerRef.current &&
        !badgePickerRef.current.contains(target) &&
        !isSlotClick
      ) {
        setSelectionMode({ active: false, targetSlot: null })
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [selectionMode.active])

  // Handler for when a badge is selected in selection mode.
  const handleBadgeSelect = useCallback(async (badgeId: string) => {
    if (!selectionMode.active || selectionMode.targetSlot === null) return
    await setFeaturedBadge(
      badgeId,
      selectionMode.targetSlot,
      user,
      setUser,
      navigate,
      setBackendErr,
      setFeaturedBadgeLoading
    )
    setSelectionMode({ active: false, targetSlot: null })
  }, [selectionMode, user, setUser, navigate])

  // Handler for removing a badge from the currently selected slot.
  const handleBadgeRemove = useCallback(async () => {
    if (!selectionMode.active || selectionMode.targetSlot === null) return

    // Find the badge currently in the target slot.
    const badgeInSlot = user.badges.find(b => b.featured === selectionMode.targetSlot)
    if (!badgeInSlot) return

    // Call setFeaturedBadge with position=null to remove from featured.
    await setFeaturedBadge(
      badgeInSlot._id,
      null,
      user,
      setUser,
      navigate,
      setBackendErr,
      setFeaturedBadgeLoading
    )
    setSelectionMode({ active: false, targetSlot: null })
  }, [selectionMode, user, setUser, navigate])

  if (loading) return <FillLoading />

  return (
    <div className="content-container profile-content">
      <ProfileCard<formType, formErrType>
        user={user}
        setUser={setUser}
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        featuredBadgeLoading={featuredBadgeLoading}
      />
      {/* Compact following row — hidden during badge selection and following detail. */}
      {!showFollowingDetail && !selectionMode.active && (
        <UserFollowing
          followingUsers={followingUsers}
          onExpand={() => setShowFollowingDetail(true)}
          loading={followingLoading}
        />
      )}

      {/* Expanded following detail replaces BadgeChampPicker when active. */}
      {showFollowingDetail ? (
        <FollowingDetail
          userId={user._id}
          onClose={() => setShowFollowingDetail(false)}
        />
      ) : (
        <BadgeChampPicker
          user={user}
          selectionMode={selectionMode}
          onBadgeSelect={handleBadgeSelect}
          onBadgeRemove={handleBadgeRemove}
          ref={badgePickerRef}
        />
      )}
      <ButtonBar
        leftButtons={showFollowingDetail ? [
          { label: "Back", onClick: () => setShowFollowingDetail(false), startIcon: <ArrowBack />, color: "inherit" }
        ] : undefined}
        rightButtons={[
          { label: "Settings", onClick: () => navigate("/settings"), endIcon: <Settings /> },
        ]}
      />
    </div>
  )
}

export default Profile
