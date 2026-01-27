import React, { CSSProperties, SyntheticEvent } from "react"
import './_seriesListCard.scss'
import { seriesType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import Banner from "../../utility/banner/Banner"

interface seriesListCardType {
  series: seriesType
  onClick?: (e: SyntheticEvent) => void
  selected?: boolean
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onDriverClick?: (driver: driverType) => void
  highlight?: boolean
  disabled?: boolean
  style?: CSSProperties
}

// Card for displaying a series in a list with driver icons underneath.
const SeriesListCard: React.FC<seriesListCardType> = ({ series, onClick, selected, canEdit, onEditClicked, onDriverClick, highlight, disabled, style }) => {

  // Build class name with optional highlight, selected, and disabled states.
  const classNames = [
    "series-list-card",
    highlight && "series-list-card-highlight",
    !disabled && selected && "selected",
    disabled && "disabled",
  ].filter(Boolean).join(" ")

  return (
    <div className={classNames} style={style} onClick={disabled ? undefined : onClick}>
      {series.official && <Banner text="Official"/>}
      <div className="main-icon-container">
        <ImageIcon src={series.url} size="contained" background/>
        {!disabled && canEdit && <EditButton
          inverted={selected}
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      <div className="series-list-content">
        <p className="series-list-title">{series.name}</p>
        <IconList items={series.drivers} onItemClick={disabled ? undefined : onDriverClick} counterInverted={!disabled && selected} />
      </div>
      {!disabled && selected && <div className="selected-banner"><span>Selected</span></div>}
    </div>
  )
}

export default SeriesListCard
