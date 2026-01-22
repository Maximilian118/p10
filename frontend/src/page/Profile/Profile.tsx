import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Settings } from "@mui/icons-material"
import "./_profile.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import { formErrType, formType, SelectionModeState, userProfileType } from "../../shared/types"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import BadgeChampPicker from "../../components/utility/badgeChampPicker/BadgeChampPicker"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import { getUserById } from "../../shared/requests/userRequests"
import { setFeaturedBadge } from "../../shared/requests/badgeRequests"

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

  // Ref for badge picker area to detect clicks outside.
  const badgePickerRef = useRef<HTMLDivElement>(null)

  // Fetch full profile data on mount.
  useEffect(() => {
    getUserById(user._id, setUserProfile, user, setUser, navigate, setLoading, setBackendErr)
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
      setBackendErr
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
      />
      <BadgeChampPicker
        user={user}
        selectionMode={selectionMode}
        onBadgeSelect={handleBadgeSelect}
        ref={badgePickerRef}
      />
      <ButtonBar buttons={[
        { label: "Settings", onClick: () => navigate("/settings"), endIcon: <Settings /> },
      ]} />
    </div>
  )
}

export default Profile
