import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ThemeProvider } from "@mui/material/styles"
import darkTheme from "../../../../../shared/muiDarkTheme"
import { ChampType, ProtestType, ProtestStatus } from "../../../../../shared/types"
import { userType } from "../../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../../shared/requests/requestsUtility"
import { formatRelativeTime, getVoteSplit } from "../../../../../shared/utility"
import {
  getProtest,
  voteOnProtest,
  moveProtestToVoting,
  determineProtest,
  allocateProtestPoints,
} from "../../../../../shared/requests/champRequests"
import FillLoading from "../../../../../components/utility/fillLoading/FillLoading"
import StatusCard from "../../../../../components/cards/statusCard/StatusCard"
import FloatingUserCard from "../../../../../components/cards/floatingUserCard/FloatingUserCard"
import VotingPanel from "../components/VotingPanel/VotingPanel"
import AdjudicationPanel from "../components/AdjudicationPanel/AdjudicationPanel"
import PointsPanel from "../components/PointsPanel/PointsPanel"
import "./_protest.scss"

interface ProtestProps {
  champ: ChampType
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  protestId: string
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onBack?: () => void
}

// Protest detail view component.
const Protest: React.FC<ProtestProps> = ({ champ, user, setUser, protestId, setBackendErr, onBack }) => {
  const navigate = useNavigate()
  const [protest, setProtest] = useState<ProtestType | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingLoading, setVotingLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Points allocation state for adjudicator.
  const [filerPoints, setFilerPoints] = useState<number | null>(null)
  const [accusedPoints, setAccusedPoints] = useState<number | null>(null)

  // Check user permissions.
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const isCompetitor = champ.competitors.some((c) => c._id === user._id)

  // Fetch protest data.
  useEffect(() => {
    const fetchProtest = async () => {
      setLoading(true)
      const fetchedProtest = await getProtest(protestId, user, setUser, navigate, setBackendErr)
      if (fetchedProtest) {
        setProtest(fetchedProtest)
        // Set default points based on status.
        if (fetchedProtest.status === "passed") {
          setFilerPoints(1)
          setAccusedPoints(fetchedProtest.accused ? -1 : null)
        } else if (fetchedProtest.status === "denied") {
          setFilerPoints(0)
        }
      }
      setLoading(false)
    }
    fetchProtest()
  }, [protestId, user, setUser, navigate, setBackendErr])

  // Handle voting.
  const handleVote = async (vote: boolean) => {
    if (!protest || votingLoading) return

    setVotingLoading(true)
    const updatedProtest = await voteOnProtest(protestId, vote, user, setUser, navigate, setBackendErr)
    if (updatedProtest) {
      setProtest(updatedProtest)
    }
    setVotingLoading(false)
  }

  // Handle moving to voting phase.
  const handleMoveToVoting = async () => {
    if (!protest || !isAdjudicator || protest.status !== "adjudicating") return

    setActionLoading(true)
    const updatedProtest = await moveProtestToVoting(protestId, user, setUser, navigate, setBackendErr)
    if (updatedProtest) {
      setProtest(updatedProtest)
    }
    setActionLoading(false)
  }

  // Handle adjudicator determination.
  const handleDetermination = async (status: ProtestStatus) => {
    if (!protest || !isAdjudicator) return

    setActionLoading(true)
    const updatedProtest = await determineProtest(protestId, status, user, setUser, navigate, setBackendErr)
    if (updatedProtest) {
      setProtest(updatedProtest)
      // Set default points based on determination.
      if (status === "passed") {
        setFilerPoints(1)
        setAccusedPoints(updatedProtest.accused ? -1 : null)
      } else if (status === "denied") {
        setFilerPoints(0)
      }
    }
    setActionLoading(false)
  }

  // Handle points allocation.
  const handleAllocatePoints = async () => {
    if (!protest || !isAdjudicator || filerPoints === null) return

    setActionLoading(true)
    const updatedProtest = await allocateProtestPoints(
      protestId,
      filerPoints,
      accusedPoints,
      user,
      setUser,
      navigate,
      setBackendErr,
    )
    if (updatedProtest) {
      setProtest(updatedProtest)
      // Navigate back to protests list after successful allocation.
      if (onBack) {
        onBack()
      }
    }
    setActionLoading(false)
  }

  // Loading state.
  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="protest protest--loading">
          <FillLoading />
        </div>
      </ThemeProvider>
    )
  }

  // Error state.
  if (!protest) {
    return (
      <ThemeProvider theme={darkTheme}>
        <div className="protest protest--error">Protest not found</div>
      </ThemeProvider>
    )
  }

  const isVoting = protest.status === "voting"
  const needsPointsAllocation =
    (protest.status === "passed" || protest.status === "denied") && !protest.pointsAllocated && isAdjudicator
  const { yesCount, noCount } = getVoteSplit(protest.votes)

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="protest">
        <div className="user-cards">
          <FloatingUserCard
            icon={protest.competitor?.icon}
            name={protest.competitor?.name || "Unknown"}
            label="Filed this protest"
            userId={protest.competitor?._id}
          />
          {protest.accused && (
            <FloatingUserCard
              icon={protest.accused.icon}
              name={protest.accused.name}
              label="Alleged offender"
              variant="accused"
              userId={protest.accused._id}
            />
          )}
        </div>
      <h2 className="protest__title">{protest.title}</h2>
      <p className="protest__description">{protest.description}</p>
      <p className="protest__filed-date">Filed {formatRelativeTime(protest.created_at)}</p>

      {/* Status card - always under filed-date, hidden when adjudicator actions are visible */}
      {!(isAdjudicator && protest.status === "adjudicating") && (
        <div className="protest__status-card-wrapper">
          <StatusCard status={protest.status} votes={protest.votes} yesCount={yesCount} noCount={noCount} />
        </div>
      )}

      {/* Voting panel - show if voting and user is competitor */}
      {isVoting && isCompetitor && (
        <VotingPanel
          votes={protest.votes}
          userId={user._id}
          votingLoading={votingLoading}
          onVote={handleVote}
        />
      )}

      {/* Adjudication panel - only during adjudicating phase */}
      {isAdjudicator && protest.status === "adjudicating" && (
        <AdjudicationPanel
          status={protest.status}
          actionLoading={actionLoading}
          onDetermination={handleDetermination}
          onMoveToVoting={handleMoveToVoting}
        />
      )}

      {/* Points allocation panel - adjudicator only, after determination */}
      {needsPointsAllocation && (
        <PointsPanel
          protest={protest}
          filerPoints={filerPoints}
          accusedPoints={accusedPoints}
          actionLoading={actionLoading}
          onFilerPointsChange={setFilerPoints}
          onAccusedPointsChange={setAccusedPoints}
          onAllocatePoints={handleAllocatePoints}
        />
      )}
      </div>
    </ThemeProvider>
  )
}

export default Protest
