import React, { useContext, useState, useCallback } from "react"
import "./_commentSection.scss"
import { SocialCommentType } from "../../../shared/socialTypes"
import { getComments, addComment, toggleCommentLike, toggleCommentDislike } from "../../../shared/requests/socialRequests"
import { graphQLErrorType, initGraphQLError } from "../../../shared/requests/requestsUtility"
import { useNavigate } from "react-router-dom"
import AppContext from "../../../context"
import CommentCard from "./CommentCard"
import { CircularProgress } from "@mui/material"

interface CommentSectionProps {
  eventId: string
  commentCount: number
}

const COMMENTS_PAGE_SIZE = 10

// Displays a collapsible comments section for a social event.
const CommentSection: React.FC<CommentSectionProps> = ({ eventId, commentCount }) => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  const [comments, setComments] = useState<SocialCommentType[]>([])
  const [expanded, setExpanded] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [inputText, setInputText] = useState<string>("")
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [localCommentCount, setLocalCommentCount] = useState<number>(commentCount)

  // Fetch comments for the event.
  const fetchComments = useCallback(async (cursor: string | null) => {
    setLoading(true)

    const result = await getComments(eventId, cursor, COMMENTS_PAGE_SIZE, user, setUser, navigate, setBackendErr)

    if (result) {
      setComments(prev => cursor ? [...prev, ...result.comments] : result.comments)
      setNextCursor(result.nextCursor)
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Toggle expanded state and fetch comments on first expand.
  const handleToggleExpand = () => {
    if (!expanded && comments.length === 0) {
      fetchComments(null)
    }
    setExpanded(!expanded)
  }

  // Load more comments.
  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      fetchComments(nextCursor)
    }
  }

  // Submit a new comment.
  const handleSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !inputText.trim() || submitting) return

    setSubmitting(true)

    const newComment = await addComment(eventId, inputText.trim(), user, setUser, navigate, setBackendErr)

    if (newComment) {
      setComments(prev => [newComment, ...prev])
      setLocalCommentCount(prev => prev + 1)
      setInputText("")

      // Auto-expand if not already.
      if (!expanded) setExpanded(true)
    }

    setSubmitting(false)
  }

  // Handle like toggle on a comment.
  const handleLike = async (commentId: string) => {
    const updated = await toggleCommentLike(commentId, user, setUser, navigate, setBackendErr)
    if (updated) {
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, ...updated } : c))
    }
  }

  // Handle dislike toggle on a comment.
  const handleDislike = async (commentId: string) => {
    const updated = await toggleCommentDislike(commentId, user, setUser, navigate, setBackendErr)
    if (updated) {
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, ...updated } : c))
    }
  }

  return (
    <div className="comment-section">
      {/* Comment count toggle. */}
      {localCommentCount > 0 && !expanded && (
        <button className="comment-section__toggle" onClick={handleToggleExpand}>
          View {localCommentCount} comment{localCommentCount !== 1 ? "s" : ""}
        </button>
      )}

      {/* Expanded comments list. */}
      {expanded && (
        <div className="comment-section__list">
          {comments.map(comment => (
            <CommentCard
              key={comment._id}
              comment={comment}
              onLike={() => handleLike(comment._id)}
              onDislike={() => handleDislike(comment._id)}
            />
          ))}

          {/* Load more button. */}
          {nextCursor && !loading && (
            <button className="comment-section__load-more" onClick={handleLoadMore}>
              Load more comments
            </button>
          )}

          {/* Loading indicator. */}
          {loading && (
            <div className="comment-section__loading">
              <CircularProgress size={20} />
            </div>
          )}

          {/* Collapse button. */}
          <button className="comment-section__toggle" onClick={handleToggleExpand}>
            Hide comments
          </button>
        </div>
      )}

      {/* Comment input. */}
      <div className="comment-section__input-wrapper">
        <input
          className="comment-section__input"
          type="text"
          placeholder="Comment..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleSubmit}
          maxLength={500}
          disabled={submitting}
        />
        {submitting && <CircularProgress size={16} className="comment-section__input-loader" />}
      </div>
    </div>
  )
}

export default CommentSection
