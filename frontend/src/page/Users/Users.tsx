import React, { useContext, useEffect, useState } from "react"
import "./_users.scss"
import { useLocation, useNavigate } from "react-router-dom"
import AppContext from "../../context"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { getFollowing, unfollowUser, UserBasicType } from "../../shared/requests/userRequests"
import Search from "../../components/utility/search/Search"
import UserCard from "../../components/cards/userCard/UserCard"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import Confirm from "../../components/utility/confirm/Confirm"
import { ArrowBack } from "@mui/icons-material"
import PersonRemoveIcon from "@mui/icons-material/PersonRemove"

interface LocationState {
  mode?: string
  title?: string
}

// Users page - currently supports "following" mode for managing followed users.
const Users: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState) || {}
  const title = state.title || "Users"

  const [users, setUsers] = useState<UserBasicType[]>([])
  const [searchResults, setSearchResults] = useState<UserBasicType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [unfollowTarget, setUnfollowTarget] = useState<UserBasicType | null>(null)
  const [unfollowLoading, setUnfollowLoading] = useState<boolean>(false)

  // Fetch followed users on mount.
  useEffect(() => {
    getFollowing(setUsers, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync search results with fetched users.
  useEffect(() => {
    setSearchResults(users)
  }, [users])

  // Handle unfollow confirmation.
  const handleUnfollow = async () => {
    if (!unfollowTarget) return
    setUnfollowLoading(true)

    const success = await unfollowUser(unfollowTarget._id, user, setUser, navigate, setBackendErr)

    if (success) {
      // Remove unfollowed user from local lists.
      setUsers(prev => prev.filter(u => u._id !== unfollowTarget._id))
    }

    setUnfollowLoading(false)
    setUnfollowTarget(null)
  }

  // Render unfollow confirmation dialog.
  if (unfollowTarget) {
    return (
      <Confirm
        variant="default"
        icon={<PersonRemoveIcon />}
        heading={`Unfollow ${unfollowTarget.name}?`}
        paragraphs={[
          `You're about to unfollow ${unfollowTarget.name}.`,
          "You can follow them again at any time."
        ]}
        cancelText="Cancel"
        confirmText="Unfollow"
        onCancel={() => setUnfollowTarget(null)}
        onConfirm={handleUnfollow}
        loading={unfollowLoading}
      />
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

  // Render user list content.
  const renderUsers = () => {
    if (loading) return <FillLoading />

    if (searchResults.length === 0) {
      return (
        <div className="users-empty">
          <p>No followed users found</p>
        </div>
      )
    }

    return searchResults.map(u => (
      <UserCard
        key={u._id}
        name={u.name}
        icon={u.icon}
        actionLabel="Unfollow"
        actionColor="error"
        onClick={() => navigate(`/profile/${u._id}`)}
        onAction={() => setUnfollowTarget(u)}
      />
    ))
  }

  return (
    <div className="content-container users-page">
      <div className="form-title">
        <h2>{title}</h2>
      </div>
      <Search
        original={users}
        setSearch={setSearchResults}
        label="Search Users"
      />
      <div className="users-list">
        {renderUsers()}
      </div>
      <ButtonBar leftButtons={[
        { label: "Back", onClick: () => navigate("/settings"), startIcon: <ArrowBack />, color: "inherit" },
      ]} />
    </div>
  )
}

export default Users
