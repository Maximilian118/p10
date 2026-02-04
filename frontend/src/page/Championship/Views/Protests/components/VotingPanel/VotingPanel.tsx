import React, { useMemo } from "react"
import { ThumbUp, ThumbDown } from "@mui/icons-material"
import { VoteType } from "../../../../../../shared/types"
import "./_votingPanel.scss"

interface VotingPanelProps {
  votes: VoteType[]
  userId: string
  votingLoading: boolean
  onVote: (vote: boolean) => void
}

// Voting panel for competitors to cast their vote on a protest.
const VotingPanel: React.FC<VotingPanelProps> = ({ votes, userId, votingLoading, onVote }) => {
  // Check if current user has already voted.
  const hasVoted = useMemo(() => {
    return votes.some((v) => v.competitor._id === userId)
  }, [votes, userId])

  // Get user's current vote if they've voted.
  const userVote = useMemo(() => {
    const vote = votes.find((v) => v.competitor._id === userId)
    return vote?.vote ?? null
  }, [votes, userId])

  return (
    <div className="voting-panel">
      {/* Show voted result or voting prompt */}
      {hasVoted ? (
        <p className="voting-panel__result">
          You Voted:
          {userVote
            ? <ThumbUp className="voting-panel__icon voting-panel__icon--yes" />
            : <ThumbDown className="voting-panel__icon voting-panel__icon--no" />
          }
        </p>
      ) : (
        <p className="voting-panel__label">Cast your vote:</p>
      )}

      {/* Vote buttons - removed once user has voted */}
      {!hasVoted && (
        <div className="voting-panel__buttons">
          <button
            className="voting-panel__btn voting-panel__btn--yes"
            onClick={() => onVote(true)}
            disabled={votingLoading}
          >
            <ThumbUp className="voting-panel__icon" />
          </button>
          <button
            className="voting-panel__btn voting-panel__btn--no"
            onClick={() => onVote(false)}
            disabled={votingLoading}
          >
            <ThumbDown className="voting-panel__icon" />
          </button>
        </div>
      )}
    </div>
  )
}

export default VotingPanel
