import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_seriesListCard.scss'
import { seriesType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface seriesListCardType {
  series: seriesType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card for displaying a series in a list with driver icons underneath.
const SeriesListCard: React.FC<seriesListCardType> = ({ series, onClick, canEdit, onEditClicked, highlight }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const seriesDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many driver icons can fit in the container.
  useEffect(() => {
    const dListWidth = seriesDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  // Build class name with optional highlight animation.
  const className = `series-list-card${highlight ? ' series-list-card-highlight' : ''}`

  return (
    <div className={className} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={series.url} size="contained"/>
        {canEdit && <EditButton
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
              return <ImageIcon key={i} src={driver.icon}/>
            } else if (i === lastIcon) {
              return (
                <CounterIcon
                  key={i}
                  counter={series.drivers.length - lastIcon}
                />
              )
            } else {
              return null
            }
          })}
        </div>
      </div>
    </div>
  )
}

export default SeriesListCard
