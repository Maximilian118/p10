import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_seriesCard.scss'
import { seriesType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface seriesCardType {
  series: seriesType
  onClick?: (e: SyntheticEvent) => void
  selected?: boolean
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
}

// Card component for displaying a series in the series picker.
const SeriesCard: React.FC<seriesCardType> = ({ series, onClick, selected, canEdit, onEditClicked }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const seriesDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many driver icons can fit in the container.
  useEffect(() => {
    const dListWidth = seriesDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  return (
    <div className={`series-card${selected ? "-selected" : ""}`} onClick={onClick}>
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
      <div className="series-content">
        {selected && <p className="series-selected">Selected</p>}
        <p className="series-title">{series.name}</p>
        <div ref={seriesDriversRef} className="series-drivers">
          {series.drivers.map((driver: driverType, i: number) => {
            if (i < lastIcon ) {
              return <ImageIcon key={i} src={driver.icon}/>
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
    </div>
  )
}

export default SeriesCard
