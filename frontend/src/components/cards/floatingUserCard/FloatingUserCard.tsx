import React from "react"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import "./_floatingUserCard.scss"

interface FloatingUserCardProps {
  icon?: string
  name: string
  label: string
  variant?: "default" | "accused"
  size?: "small" | "medium" | "medium-large"
  userId?: string
}

// Reusable card component for displaying a user with icon, name, and label.
const FloatingUserCard: React.FC<FloatingUserCardProps> = ({
  icon,
  name,
  label,
  variant = "default",
  size = "medium",
  userId,
}) => {
  const navigate = useNavigate()

  const containerClass = [
    "floating-user-card",
    variant === "accused" && "floating-user-card--accused",
    userId && "floating-user-card--clickable",
  ]
    .filter(Boolean)
    .join(" ")

  // Navigate to user profile when card is clicked.
  const handleClick = () => {
    if (userId) {
      navigate(`/profile/${userId}`)
    }
  }

  return (
    <div className={containerClass} onClick={handleClick}>
      <ImageIcon src={icon || ""} size={size} />
      <div className="floating-user-card__info">
        <p className="floating-user-card__name">{name}</p>
        <p className="floating-user-card__label">{label}</p>
      </div>
    </div>
  )
}

export default FloatingUserCard
