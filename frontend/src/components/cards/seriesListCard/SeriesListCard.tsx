import React, { SyntheticEvent } from "react"
import './_seriesListCard.scss'
import { seriesType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"

interface seriesListCardType {
  series: seriesType
  onClick?: (e: SyntheticEvent) => void
  selected?: boolean
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onDriverClick?: (driver: driverType) => void
  highlight?: boolean
}

// Card for displaying a series in a list with driver icons underneath.
const SeriesListCard: React.FC<seriesListCardType> = ({ series, onClick, selected, canEdit, onEditClicked, onDriverClick, highlight }) => {

  // Build class name with optional highlight and selected states.
  const classNames = [
    "series-list-card",
    highlight && "series-list-card-highlight",
    selected && "selected",
  ].filter(Boolean).join(" ")

  return (
    <div className={classNames} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={series.url} size="contained"/>
        {canEdit && <EditButton
          inverted={selected}
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      <div className="series-list-content">
        <p className="series-list-title">{series.name}</p>
        <IconList items={series.drivers} onItemClick={onDriverClick} counterInverted={selected} />
      </div>
      {selected && <div className="selected-banner"><span>Selected</span></div>}
    </div>
  )
}

export default SeriesListCard
