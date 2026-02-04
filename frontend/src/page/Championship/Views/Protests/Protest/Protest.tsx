import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ThemeProvider } from "@mui/material/styles"
import darkTheme from "../../../../../shared/muiDarkTheme"
import { ChampType, ProtestType, ProtestStatus, PointsAdjustmentType, CompetitorEntryType } from "../../../../../shared/types"
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
import HowToVote from "@mui/icons-material/HowToVote"
import ThumbUp from "@mui/icons-material/ThumbUp"
import ThumbDown from "@mui/icons-material/ThumbDown"
import FillLoading from "../../../../../components/utility/fillLoading/FillLoading"
import Confirm from "../../../../../components/utility/confirm/Confirm"
import StatusCard from "../../../../../components/cards/statusCard/StatusCard"
import FloatingUserCard from "../../../../../components/cards/floatingUserCard/FloatingUserCard"
import VotingPanel from "../components/VotingPanel/VotingPanel"
import AdjudicationPanel from "../components/AdjudicationPanel/AdjudicationPanel"
import PointsPanel from "../components/PointsPanel/PointsPanel"
import "./_protest.scss"
import { Done, DoNotDisturb } from "@mui/icons-material"

type ProtestConfirmAction = "pass" | "deny" | "moveToVote" | "voteYes" | "voteNo" | null

// Confirm dialog configuration for each protest action.
const confirmConfigs: Record<NonNullable<ProtestConfirmAction>, {
  variant: "default" | "danger" | "success" | "dark"
  icon: React.ReactNode
  heading: string
  text: string
  confirmText: string
}> = {
  pass: {
    variant: "success",
    icon: <Done />,
    heading: "Pass Protest",
    text: "Are you sure you want to pass this protest? This action is irreversible.",
    confirmText: "Pass",
  },
  deny: {
    variant: "danger",
    icon: <DoNotDisturb />,
    heading: "Deny Protest",
    text: "Are you sure you want to deny this protest? This action is irreversible.",
    confirmText: "Deny",
  },
  moveToVote: {
    variant: "dark",
    icon: <HowToVote />,
    heading: "Move to Vote",
    text: "Are you sure you want to open this protest to a vote? This action is irreversible.",
    confirmText: "Move to Vote",
  },
  voteYes: {
    variant: "success",
    icon: <ThumbUp />,
    heading: "Vote in Favour",
    text: "Are you sure you want to vote in favour of this protest?",
    confirmText: "Vote Yes",
  },
  voteNo: {
    variant: "danger",
    icon: <ThumbDown />,
    heading: "Vote Against",
    text: "Are you sure you want to vote against this protest?",
    confirmText: "Vote No",
  },
}

interface ProtestProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  protestId: string
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onBack?: () => void
  onConfirmChange?: (active: boolean) => void
}

// Apply a penalty adjustment to a competitor in the given competitors array.
// Returns a new array with updated adjustment and recalculated grandTotalPoints.
const applyAdjustment = (
  competitors: CompetitorEntryType[],
  competitorId: string,
  points: number,
  reason: string,
): CompetitorEntryType[] => {
  return competitors.map((comp) => {
    if (comp.competitor?._id !== competitorId) return comp

    const now = new Date().toISOString()
    const newAdjustment: PointsAdjustmentType = {
      adjustment: points,
      type: "penalty",
      reason,
      updated_at: null,
      created_at: now,
    }
    const updatedAdjustments = [...(comp.adjustment || []), newAdjustment]
    const adjustmentSum = updatedAdjustments.reduce((sum, adj) => sum + adj.adjustment, 0)

    return {
      ...comp,
      adjustment: updatedAdjustments,
      grandTotalPoints: comp.totalPoints + adjustmentSum,
    }
  })
}

// Protest detail view component.
const Protest: React.FC<ProtestProps> = ({ champ, setChamp, user, setUser, protestId, setBackendErr, onBack, onConfirmChange }) => {
  const navigate = useNavigate()
  const [protest, setProtest] = useState<ProtestType | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingLoading, setVotingLoading] = useState(false)

  // Tracks which confirmation dialog is currently active.
  const [confirmAction, setConfirmAction] = useState<ProtestConfirmAction>(null)

  // Points allocation state for adjudicator.
  const [filerPoints, setFilerPoints] = useState<number | null>(null)
  const [accusedPoints, setAccusedPoints] = useState<number | null>(null)

  // Notify parent when a confirm dialog is shown/hidden.
  useEffect(() => {
    onConfirmChange?.(confirmAction !== null)
  }, [confirmAction, onConfirmChange])

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

    const updatedProtest = await moveProtestToVoting(protestId, user, setUser, navigate, setBackendErr)
    if (updatedProtest) {
      setProtest(updatedProtest)
    }
  }

  // Handle adjudicator determination.
  const handleDetermination = async (status: ProtestStatus) => {
    if (!protest || !isAdjudicator) return

    const updatedProtest = await determineProtest(protestId, status, user, setUser, navigate, setBackendErr)
    if (updatedProtest) {
      setProtest(updatedProtest)
      // Set default points based on determination.
      if (status === "passed") {
        setFilerPoints(1)
        setAccusedPoints(updatedProtest.accused ? -1 : null)
      }
    }
  }

  // Handle points allocation with optimistic champ state update.
  const handleAllocatePoints = async () => {
    if (!protest || !isAdjudicator) return

    const effectiveFilerPoints = filerPoints ?? 0
    const updatedProtest = await allocateProtestPoints(
      protestId,
      effectiveFilerPoints,
      accusedPoints,
      user,
      setUser,
      navigate,
      setBackendErr,
    )
    if (updatedProtest) {
      setProtest(updatedProtest)

      // Optimistic champ state update to reflect points changes immediately.
      const reason = `Protest determination: ${protest.title}`
      setChamp((prev) => {
        if (!prev) return prev

        // Find the last completed round.
        let completedIdx = -1
        for (let i = prev.rounds.length - 1; i >= 0; i--) {
          if (prev.rounds[i].status === "completed") {
            completedIdx = i
            break
          }
        }
        if (completedIdx === -1) return prev

        const updatedRounds = [...prev.rounds]
        let completedCompetitors = [...updatedRounds[completedIdx].competitors]

        // Apply filer adjustment.
        if (effectiveFilerPoints !== 0 && protest.competitor?._id) {
          completedCompetitors = applyAdjustment(completedCompetitors, protest.competitor._id, effectiveFilerPoints, reason)
        }

        // Apply accused adjustment.
        if (accusedPoints != null && accusedPoints !== 0 && protest.accused?._id) {
          completedCompetitors = applyAdjustment(completedCompetitors, protest.accused._id, accusedPoints, reason)
        }

        updatedRounds[completedIdx] = { ...updatedRounds[completedIdx], competitors: completedCompetitors }

        // Propagate to next "waiting" round if it exists.
        const nextIdx = completedIdx + 1
        if (nextIdx < updatedRounds.length && updatedRounds[nextIdx].status === "waiting") {
          const nextCompetitors = updatedRounds[nextIdx].competitors.map((nextComp) => {
            const completedComp = completedCompetitors.find(
              (c) => c.competitor?._id === nextComp.competitor?._id,
            )
            if (!completedComp) return nextComp
            return {
              ...nextComp,
              totalPoints: completedComp.grandTotalPoints,
              grandTotalPoints: completedComp.grandTotalPoints,
            }
          })
          updatedRounds[nextIdx] = { ...updatedRounds[nextIdx], competitors: nextCompetitors }
        }

        return { ...prev, rounds: updatedRounds }
      })

      // Navigate back to protests list after successful allocation.
      if (onBack) {
        onBack()
      }
    }
  }

  // Execute the confirmed action and close the dialog.
  const handleConfirm = async () => {
    switch (confirmAction) {
      case "pass":
        await handleDetermination("passed")
        break
      case "deny":
        await handleDetermination("denied")
        break
      case "moveToVote":
        await handleMoveToVoting()
        break
      case "voteYes":
        await handleVote(true)
        break
      case "voteNo":
        await handleVote(false)
        break
    }
    setConfirmAction(null)
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

  // Resolve the active confirm dialog config.
  const activeConfig = confirmAction ? confirmConfigs[confirmAction] : null

  return (
    <ThemeProvider theme={darkTheme}>
      {/* Confirmation dialog — replaces protest content when active */}
      {activeConfig && (
        <Confirm
          variant={activeConfig.variant}
          icon={activeConfig.icon}
          heading={activeConfig.heading}
          paragraphs={[activeConfig.text]}
          cancelText="Back"
          confirmText={activeConfig.confirmText}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      )}

      {/* Protest content — hidden while a confirm dialog is active */}
      {!confirmAction && (
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
                label={protest.status === "passed" ? "Offender" : "Alleged offender"}
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
              onVote={(vote) => setConfirmAction(vote ? "voteYes" : "voteNo")}
            />
          )}

          {/* Adjudication panel - only during adjudicating phase */}
          {isAdjudicator && protest.status === "adjudicating" && (
            <AdjudicationPanel
              status={protest.status}
              onDetermination={(status) => setConfirmAction(status === "passed" ? "pass" : "deny")}
              onMoveToVoting={() => setConfirmAction("moveToVote")}
            />
          )}

          {/* Points allocation panel - adjudicator only, after determination */}
          {needsPointsAllocation && (
            <PointsPanel
              protest={protest}
              filerPoints={filerPoints}
              accusedPoints={accusedPoints}
              onFilerPointsChange={setFilerPoints}
              onAccusedPointsChange={setAccusedPoints}
              onAllocatePoints={handleAllocatePoints}
            />
          )}
        </div>
      )}
    </ThemeProvider>
  )
}

export default Protest
