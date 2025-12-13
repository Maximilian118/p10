import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_seriesListCard.scss'
import { seriesType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

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
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const seriesDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many driver icons can fit in the container.
  useEffect(() => {
    const dListWidth = seriesDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

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
        <div ref={seriesDriversRef} className="series-list-drivers">
          {series.drivers.map((driver: driverType, i: number) => {
            if (i < lastIcon) {
              return (
                <ImageIcon
                  key={i}
                  src={driver.icon}
                  onClick={onDriverClick ? (e) => {
                    e.stopPropagation()
                    onDriverClick(driver)
                  } : undefined}
                />
              )
            } else if (i === lastIcon) {
              return (
                <CounterIcon
                  key={i}
                  inverted={selected}
                  counter={series.drivers.length - lastIcon}
                />
              )
            } else {
              return null
            }
          })}
        </div>
      </div>
      {selected && <div className="selected-banner"><span>Selected</span></div>}
    </div>
  )
}

export default SeriesListCard
