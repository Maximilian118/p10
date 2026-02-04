import React, { useMemo } from "react"
import { ThemeProvider } from "@mui/material/styles"
import darkTheme from "../../../../shared/muiDarkTheme"
import { ChampType, ProtestType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import ProtestItem from "../../components/ProtestItem/ProtestItem"
import CreateProtest from "./CreateProtest/CreateProtest"
import "./_protests.scss"

interface ProtestsProps {
  champ: ChampType
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  protests: ProtestType[]
  onProtestClick?: (protest: ProtestType) => void
  showCreateForm?: boolean
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onCreateSuccess?: (protest: ProtestType) => void
  onCreateCancel?: () => void
  onSubmitRef?: React.MutableRefObject<(() => Promise<void>) | null>
  setCreateLoading?: React.Dispatch<React.SetStateAction<boolean>>
}

// Sorts protests: action required first, then open, then closed.
const sortProtests = (protests: ProtestType[], isAdjudicator: boolean): ProtestType[] => {
  // Sort by created_at descending (newest first).
  const sortByDate = (a: ProtestType, b: ProtestType) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

  // Action required: determined but points not allocated (adjudicator only).
  const actionRequired = isAdjudicator
    ? protests.filter((p) => (p.status === "passed" || p.status === "denied") && !p.pointsAllocated)
    : []

  // Open: adjudicating or voting.
  const open = protests.filter((p) => p.status === "adjudicating" || p.status === "voting")

  // Closed: determined AND points allocated.
  const closed = protests.filter((p) => (p.status === "denied" || p.status === "passed") && p.pointsAllocated)

  return [...actionRequired.sort(sortByDate), ...open.sort(sortByDate), ...closed.sort(sortByDate)]
}

// Protests view - displays all protests for the championship.
const Protests: React.FC<ProtestsProps> = ({
  champ,
  user,
  setUser,
  protests,
  onProtestClick,
  showCreateForm,
  setBackendErr,
  onCreateSuccess,
  onCreateCancel,
  onSubmitRef,
  setCreateLoading,
}) => {
  // Check if current user is adjudicator.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id

  // Memoize sorted protests to avoid re-sorting on every render.
  const sortedProtests = useMemo(() => sortProtests(protests, isAdjudicator), [protests, isAdjudicator])

  // Render create form if in create mode.
  if (showCreateForm) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CreateProtest
          champ={champ}
          user={user}
          setUser={setUser}
          setBackendErr={setBackendErr}
          onSuccess={onCreateSuccess || (() => {})}
          onCancel={onCreateCancel || (() => {})}
          onSubmitRef={onSubmitRef}
          setLoading={setCreateLoading}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="protests-view">
        {sortedProtests.length === 0 ? (
          <p className="protests-view__empty">No protests have been lodged.</p>
        ) : (
          sortedProtests.map((protest) => (
            <ProtestItem
              key={protest._id}
              protest={protest}
              isAdjudicator={isAdjudicator}
              onClick={() => onProtestClick?.(protest)}
            />
          ))
        )}
      </div>
    </ThemeProvider>
  )
}

export default Protests
