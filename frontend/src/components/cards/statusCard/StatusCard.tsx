import React from "react"
import { ProtestStatus, VoteType } from "../../../shared/types"
import { getVoteSplit } from "../../../shared/utility"
import "./_statusCard.scss"

interface StatusCardProps {
  status: ProtestStatus
  votes?: VoteType[] // For gradient calculation in voting status.
  yesCount?: number // Optional yes vote count displayed on the left (over green).
  noCount?: number // Optional no vote count displayed on the right (over red).
  actionRequired?: boolean // Shows "Action Required" text.
  variant?: "default" | "compact" | "notification"
}

// Returns display text for a protest status.
const getStatusText = (status: ProtestStatus, actionRequired: boolean): string => {
  if (actionRequired) return "Action Required"
  switch (status) {
    case "adjudicating":
      return "Adjudicating"
    case "voting":
      return "Voting"
    case "passed":
      return "Passed"
    case "denied":
      return "Denied"
    default:
      return status
  }
}

// Reusable status card component for displaying protest status.
const StatusCard: React.FC<StatusCardProps> = ({
  status,
  votes,
  yesCount,
  noCount,
  actionRequired = false,
  variant = "default",
}) => {
  const isVoting = status === "voting"
  const { yesPercent } = getVoteSplit(votes || [])

  // Build class names.
  const cardClass = [
    "status-card",
    `status-card--${status}`,
    `status-card--${variant}`,
  ].join(" ")

  // Inline style for voting gradient.
  const votingStyle = isVoting
    ? { background: `linear-gradient(to right, var(--status-card-success) ${yesPercent}%, var(--status-card-error) ${yesPercent}%)` }
    : undefined

  // Hide vote counts for passed/denied protests that never went to vote.
  const showVoteCounts = !(yesCount === 0 && noCount === 0 && (status === "passed" || status === "denied"))

  return (
    <div className={cardClass} style={votingStyle}>
      {showVoteCounts && yesCount !== undefined && (
        <span className="status-card__count status-card__count--yes">{yesCount}</span>
      )}
      <span className="status-card__text">{getStatusText(status, actionRequired)}</span>
      {showVoteCounts && noCount !== undefined && (
        <span className="status-card__count status-card__count--no">{noCount}</span>
      )}
    </div>
  )
}

export default StatusCard
