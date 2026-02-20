import React, { useContext } from "react"
import "./_commentSection.scss"
import { useNavigate } from "react-router-dom"
import { SocialCommentType } from "../../../shared/socialTypes"
import { formatRelativeTime } from "../../../shared/utils/formatTime"
import { formatCompactNumber } from "../../../shared/utils/formatNumber"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import AppContext from "../../../context"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import ThumbDownIcon from "@mui/icons-material/ThumbDown"
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined"
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined"

interface CommentCardProps {
  comment: SocialCommentType
  onLike: () => void
  onDislike: () => void
}

// Displays a single comment with like/dislike actions.
const CommentCard: React.FC<CommentCardProps> = ({ comment, onLike, onDislike }) => {
  const { user } = useContext(AppContext)
  const navigate = useNavigate()

  // Check if current user has liked or disliked this comment.
  const hasLiked = comment.likes.includes(user._id)
  const hasDisliked = comment.dislikes.includes(user._id)

  // Navigate to the commenter's profile.
  const handleUserClick = () => {
    if (comment.user === user._id) {
      navigate("/profile")
    } else {
      navigate(`/profile/${comment.user}`)
    }
  }

  return (
    <div className="comment-card">
      <div className="comment-card__header">
        <div className="comment-card__user" onClick={handleUserClick}>
          <ImageIcon src={comment.userSnapshot.icon} size="small" />
          <span className="comment-card__name">{comment.userSnapshot.name}</span>
        </div>
        <span className="comment-card__time">{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p className="comment-card__text">{comment.text}</p>
      <div className="comment-card__actions">
        <button className={`comment-card__action${hasLiked ? " comment-card__action--active" : ""}`} onClick={onLike}>
          {hasLiked ? <ThumbUpIcon fontSize="inherit" /> : <ThumbUpOutlinedIcon fontSize="inherit" />}
          {comment.likesCount > 0 && <span>{formatCompactNumber(comment.likesCount)}</span>}
        </button>
        <button className={`comment-card__action${hasDisliked ? " comment-card__action--active" : ""}`} onClick={onDislike}>
          {hasDisliked ? <ThumbDownIcon fontSize="inherit" /> : <ThumbDownOutlinedIcon fontSize="inherit" />}
          {comment.dislikesCount > 0 && <span>{formatCompactNumber(comment.dislikesCount)}</span>}
        </button>
      </div>
    </div>
  )
}

export default CommentCard
