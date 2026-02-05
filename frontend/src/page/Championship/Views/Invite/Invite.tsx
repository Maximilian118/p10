import React, { useEffect, useState } from "react"
import "./_invite.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { NavigateFunction } from "react-router-dom"
import { getUsers, UserBasicType } from "../../../../shared/requests/userRequests"
import { inviteUser } from "../../../../shared/requests/champRequests"
import Search from "../../../../components/utility/search/Search"
import UserCard from "../../../../components/cards/userCard/UserCard"
import FillLoading from "../../../../components/utility/fillLoading/FillLoading"

interface InviteProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Invite view component - allows adjudicators (or competitors in open championships) to invite users.
const Invite: React.FC<InviteProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  navigate,
  setBackendErr,
}) => {
  // All users fetched from the backend.
  const [users, setUsers] = useState<UserBasicType[]>([])
  // Filtered users based on search query.
  const [searchResults, setSearchResults] = useState<UserBasicType[]>([])
  // Loading state for initial fetch.
  const [loading, setLoading] = useState<boolean>(true)
  // User currently being invited (for loading state on card).
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null)

  // Fetch all users on mount.
  useEffect(() => {
    getUsers(setUsers, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize search results when users are fetched.
  useEffect(() => {
    setSearchResults(users)
  }, [users])

  // Filter out users who are already competitors, already invited, banned, or the adjudicator.
  const getAvailableUsers = (): UserBasicType[] => {
    const competitorIds = new Set(champ.competitors.map(c => c._id))
    const invitedIds = new Set(champ.invited?.map(i => i._id) || [])
    const bannedIds = new Set(champ.banned?.map(b => b._id) || [])
    const adjudicatorId = champ.adjudicator?.current?._id

    return searchResults.filter(u =>
      u._id !== adjudicatorId &&
      !competitorIds.has(u._id) &&
      !invitedIds.has(u._id) &&
      !bannedIds.has(u._id)
    )
  }

  // Handle clicking on a user card to invite them.
  const handleInvite = async (userId: string) => {
    setInvitingUserId(userId)
    await inviteUser(champ._id, userId, setChamp, user, setUser, navigate, setBackendErr)
    setInvitingUserId(null)
  }

  // Render list of available users.
  const renderUsers = () => {
    if (loading) return <FillLoading />

    const availableUsers = getAvailableUsers()

    if (availableUsers.length === 0) {
      return (
        <div className="invite-empty">
          <p>No users available to invite</p>
        </div>
      )
    }

    return availableUsers.map(u => (
      <UserCard
        key={u._id}
        name={u.name}
        icon={u.icon}
        loading={invitingUserId === u._id}
        onClick={() => !invitingUserId && handleInvite(u._id)}
      />
    ))
  }

  return (
    <div className="invite-view">
      <Search
        original={users}
        setSearch={setSearchResults}
        label="Search Users"
      />
      <div className="invite-list">
        {renderUsers()}
      </div>
    </div>
  )
}

export default Invite
