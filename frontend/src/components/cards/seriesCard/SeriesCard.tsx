import React from "react"
import "./_seriesCard.scss"
import { seriesType } from "../../../shared/types"

interface SeriesCardProps {
  series: seriesType
}

// Displays a series with optional click interaction.
const SeriesCard: React.FC<SeriesCardProps> = ({ series }) => {
  return (
    <div className="series-card">
      <div className="series-card__icon">
        <img src={series.url} alt={series.name} />
      </div>
      <p className="series-card__title">{series.name}</p>
    </div>
  )
}

export default SeriesCard
