import React, { SyntheticEvent } from "react"
import { useNavigate } from "react-router-dom"
import './_competitorCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { CompetitorEntryType } from "../../../shared/types"
import Points from "./Points/Points"

interface competitorCardType {
  competitorEntry: CompetitorEntryType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Simple card component for displaying a competitor in a list.
const CompetitorCard: React.FC<competitorCardType> = ({ competitorEntry, onClick, highlight }) => {
  const navigate = useNavigate()

  // Handle card click - navigate to profile or use custom handler.
  const handleClick = (e: SyntheticEvent) => {
    if (onClick) {
      onClick(e)
    } else {
      navigate(`/profile/${competitorEntry.competitor._id}`)
    }
  }

  // Build class name with optional highlight animation.
  const className = `competitor-card${highlight ? ' competitor-card-highlight' : ''}`

  return (
    <div className={className} onClick={handleClick}>
      <ImageIcon src={competitorEntry.competitor.icon} size="large" />
      <Points total={competitorEntry.totalPoints} last={competitorEntry.points} position={competitorEntry.position}/>
      <p className="competitor-name">{competitorEntry.competitor.name}</p>
    </div>
  )
}

export default CompetitorCard
