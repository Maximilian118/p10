import React, { useContext, useEffect, useMemo, useState } from "react"
import "./_userFollowing.scss"
import { useNavigate } from "react-router-dom"
import { Close } from "@mui/icons-material"
import AppContext from "../../../context"
import { FollowingDetailedUser, ChampSnapshotType } from "../../../shared/socialTypes"
import { getFollowingDetailed } from "../../../shared/requests/socialRequests"
import { graphQLErrorType, initGraphQLError } from "../../../shared/requests/requestsUtility"
import Search from "../../utility/search/Search"
import UserCard from "../userCard/UserCard"
import FillLoading from "../../utility/fillLoading/FillLoading"
import ErrorDisplay from "../../utility/errorDisplay/ErrorDisplay"

interface FollowingDetailProps {
  userId: string
  onClose: () => void
}

// Sorts championship icons for a followed user: common champs (shared with viewer) first, then rest.
const sortChampIcons = (champs: ChampSnapshotType[], viewerChampIds: Set<string>): ChampSnapshotType[] => {
  const common: ChampSnapshotType[] = []
  const rest: ChampSnapshotType[] = []

  for (const c of champs) {
    if (viewerChampIds.has(c._id)) common.push(c)
    else rest.push(c)
  }

  // Sort each group by updated_at descending (most recent first).
  const byRecent = (a: ChampSnapshotType, b: ChampSnapshotType) =>
    (b.updated_at ?? "").localeCompare(a.updated_at ?? "")

  return [...common.sort(byRecent), ...rest.sort(byRecent)]
}

// Sorts followed users: same-champ first (by shared count desc), then same-country, then rest alphabetically.
const sortUsers = (
  users: FollowingDetailedUser[],
  viewerChampIds: Set<string>,
  viewerCountry?: string,
): FollowingDetailedUser[] => {
  return [...users].sort((a, b) => {
    const aShared = a.championships.filter((c) => viewerChampIds.has(c._id)).length
    const bShared = b.championships.filter((c) => viewerChampIds.has(c._id)).length

    // Users sharing champs come first, sorted by number of shared champs descending.
    if (aShared > 0 || bShared > 0) {
      if (aShared !== bShared) return bShared - aShared
      return a.name.localeCompare(b.name)
    }

    // Then users in the same country as the viewer.
    const aGeo = viewerCountry && a.location?.country === viewerCountry
    const bGeo = viewerCountry && b.location?.country === viewerCountry
    if (aGeo && !bGeo) return -1
    if (!aGeo && bGeo) return 1

    // Rest sorted alphabetically.
    return a.name.localeCompare(b.name)
  })
}

// Expanded following detail view with search and sorted user list.
const FollowingDetail: React.FC<FollowingDetailProps> = ({ userId, onClose }) => {
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)

  const [users, setUsers] = useState<FollowingDetailedUser[]>([])
  const [filtered, setFiltered] = useState<FollowingDetailedUser[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Build a set of the viewer's championship IDs for efficient lookup.
  const viewerChampIds = useMemo(
    () => new Set(user.championships.map((c) => c._id)),
    [user.championships],
  )

  // Fetch detailed following data on mount.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getFollowingDetailed(userId, user, setUser, navigate, setBackendErr)
      if (result) {
        const sorted = sortUsers(result, viewerChampIds, user.location?.country)
        setUsers(sorted)
        setFiltered(sorted)
      }
      setLoading(false)
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) return <FillLoading />

  // Render error state.
  if (backendErr.message) {
    return <ErrorDisplay backendErr={backendErr} />
  }

  return (
    <div className="following-detail">
      <div className="following-detail-header">
        <span className="following-detail-title">Following ({users.length})</span>
        <Close className="following-detail-close" onClick={onClose} />
      </div>

      {users.length > 0 && (
        <div className="following-detail-search">
          <Search original={users} setSearch={setFiltered} preserveOrder label="Search followed users" />
        </div>
      )}

      <div className="following-detail-list">
        {filtered.length > 0 ? (
          filtered.map((u) => (
            <UserCard
              key={u._id}
              name={u.name}
              icon={u.icon}
              onClick={() => navigate(`/profile/${u._id}`)}
              icons={sortChampIcons(u.championships, viewerChampIds)}
              onIconClick={(champ) => navigate(`/championship/${champ._id}`)}
            />
          ))
        ) : (
          <p className="following-detail-empty">No followed users found.</p>
        )}
      </div>
    </div>
  )
}

export default FollowingDetail
