import React, { SyntheticEvent } from "react"
import { useNavigate } from "react-router-dom"
import './_competitorCard.scss'
import { userType } from "../../../shared/localStorage"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface competitorCardType {
  competitor: userType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Simple card component for displaying a competitor in a list.
const CompetitorCard: React.FC<competitorCardType> = ({ competitor, onClick, highlight }) => {
  const navigate = useNavigate()

  // Handle card click - navigate to profile or use custom handler.
  const handleClick = (e: SyntheticEvent) => {
    if (onClick) {
      onClick(e)
    } else {
      navigate(`/profile/${competitor._id}`)
    }
  }

  // Build class name with optional highlight animation.
  const className = `competitor-card${highlight ? ' competitor-card-highlight' : ''}`

  return (
    <div className={className} onClick={handleClick}>
      <div className="competitor-icon-container">
        <ImageIcon src={competitor.icon} size="contained" />
      </div>
      <p className="competitor-name">{competitor.name}</p>
    </div>
  )
}

export default CompetitorCard
