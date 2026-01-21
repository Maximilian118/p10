import React, { useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Settings } from "@mui/icons-material"
import "./_profile.scss"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import AppContext from "../../context"
import ProfileCard from "../../components/cards/profileCard/ProfileCard"
import { formErrType, formType, userProfileType } from "../../shared/types"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import BadgeChampPicker from "../../components/utility/badgeChampPicker/BadgeChampPicker"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import { getUserById } from "../../shared/requests/userRequests"

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
      />
      <BadgeChampPicker user={user}/>
      <ButtonBar buttons={[
        { label: "Settings", onClick: () => navigate("/settings"), endIcon: <Settings /> },
      ]} />
    </div>
  )
}

export default Profile
