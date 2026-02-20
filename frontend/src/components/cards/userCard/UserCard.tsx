import React from "react"
import './_userCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import { Button, CircularProgress } from "@mui/material"

// Icon item type for the optional icons list (e.g. championship icons).
interface IconItem {
  _id: string
  icon: string
}

interface UserCardProps {
  name: string
  icon: string
  onClick?: () => void
  onAction?: () => void
  actionLabel?: string
  actionColor?: "success" | "error" | "primary"
  loading?: boolean
  icons?: IconItem[]
  onIconClick?: (item: IconItem) => void
}

// Displays a user card with either an action button or an icon list on the right.
// When `icons` is provided, renders an IconList instead of the action button.
const UserCard: React.FC<UserCardProps> = ({
  name,
  icon,
  loading,
  onClick,
  onAction,
  actionLabel = "Invite",
  actionColor = "success",
  icons,
  onIconClick,
}) => {
  // Handle action button click, preventing card-level click propagation.
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAction) onAction()
    else if (onClick) onClick()
  }

  // Render icon list or action button on the right side of the card.
  const renderRight = () => {
    if (icons && icons.length > 0) {
      return (
        <div className="user-card-icons">
          <IconList items={icons} onItemClick={onIconClick} />
        </div>
      )
    }

    if (loading) return <CircularProgress size={30} />

    return (
      <Button
        variant="contained"
        size="small"
        color={actionColor}
        className="invite-button"
        onClick={handleActionClick}
      >
        {actionLabel}
      </Button>
    )
  }

  return (
    <div className="user-card" onClick={onClick}>
      <ImageIcon src={icon} size="medium-large"/>
      <p className="competitor-name">{name}</p>
      {renderRight()}
    </div>
  )
}

export default UserCard
