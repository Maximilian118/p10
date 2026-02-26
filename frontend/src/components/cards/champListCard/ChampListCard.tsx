import React from "react"
import "./_champListCard.scss"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { Button, CircularProgress } from "@mui/material"

interface ChampListCardProps {
  name: string
  icon: string
  onClick?: () => void
  loading?: boolean
  invited?: boolean
}

// Displays a championship card with icon, name, and an invite/invited action button.
const ChampListCard: React.FC<ChampListCardProps> = ({
  name,
  icon,
  onClick,
  loading,
  invited,
}) => {
  // Handle action button click, preventing card-level click propagation.
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) onClick()
  }

  // Render action button or loading spinner on the right side.
  const renderRight = () => {
    if (loading) return <CircularProgress size={30} />

    return (
      <Button
        variant={invited ? "outlined" : "contained"}
        size="small"
        color={invited ? "inherit" : "success"}
        className="champ-list-card-button"
        onClick={handleActionClick}
      >
        {invited ? "Revoke" : "Invite"}
      </Button>
    )
  }

  return (
    <div className="champ-list-card">
      <ImageIcon src={icon} size="medium-large" />
      <p className="champ-list-card-name">{name}</p>
      {renderRight()}
    </div>
  )
}

export default ChampListCard
