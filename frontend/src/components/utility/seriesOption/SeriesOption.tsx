import React from "react"
import { seriesType } from "../../../shared/types"
import ImageIcon from "../icon/imageIcon/ImageIcon"
import "./_seriesOption.scss"

interface SeriesOptionProps {
  series: seriesType
  disabled?: boolean
}

// Compact card for rendering a series inside an Autocomplete dropdown.
const SeriesOption: React.FC<SeriesOptionProps> = ({ series, disabled }) => {
  const className = `series-option${disabled ? " series-option--disabled" : ""}`

  return (
    <div className={className}>
      <ImageIcon src={series.icon} size="small" />
      <div className="series-option-content">
        <span className="series-option-name">{series.name}</span>
        <span className="series-option-stats">
          {series.drivers?.length || 0} drivers · {series.championships?.length || 0} championships
        </span>
      </div>
      <div className="series-option-rounds">
        {series.rounds && series.rounds > 0 ? (
          <span className="series-option-rounds-badge">{series.rounds} rnds</span>
        ) : (
          <span className="series-option-rounds-none">Rounds not set</span>
        )}
      </div>
    </div>
  )
}

export default SeriesOption
