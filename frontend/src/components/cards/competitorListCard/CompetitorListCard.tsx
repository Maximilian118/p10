import React, { SyntheticEvent } from "react"
import { useNavigate } from "react-router-dom"
import './_competitorListCard.scss'
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { CompetitorEntryType } from "../../../shared/types"
import Points from "../../utility/points/Points"

interface competitorListCardType {
  entry: CompetitorEntryType
  onClick?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card component for displaying a competitor in a list.
const CompetitorListCard: React.FC<competitorListCardType> = ({ entry, onClick, highlight }) => {
  const navigate = useNavigate()

  // Handle card click - navigate to profile or use custom handler.
  const handleClick = (e: SyntheticEvent) => {
    if (onClick) {
      onClick(e)
    } else {
      navigate(`/profile/${entry.competitor._id}`)
    }
  }

  // Build class name with optional highlight animation.
  const className = `competitor-list-card${highlight ? ' competitor-list-card__highlight' : ''}`

  return (
    <div className={className} onClick={handleClick}>
      <ImageIcon src={entry.competitor.icon} size="x-large" />
      <Points total={entry.totalPoints} last={entry.points} position={entry.position}/>
      <p className="competitor-name">{entry.competitor.name}</p>
    </div>
  )
}

export default CompetitorListCard
