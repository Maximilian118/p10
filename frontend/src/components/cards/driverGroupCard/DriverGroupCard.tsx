import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_driverGroupCard.scss'
import { driverGroupType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface driverGroupCardType {
  group: driverGroupType
  onClick?: (e: SyntheticEvent) => void
  selected?: boolean
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
}

const DriverGroupCard: React.FC<driverGroupCardType> = ({ group, onClick, selected, canEdit, onEditClicked }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const groupDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  useEffect(() => {
    const dListWidth = groupDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  return (
    <div className={`driver-group-card${selected ? "-selected" : ""}`} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={group.url} size="contained"/>
        {canEdit && <EditButton
          inverted={selected}
          onClick={e => {
            e.stopPropagation()
            onEditClicked && onEditClicked(e)
          }}
        />}
      </div>
      <div className="driver-group-content">
        {selected && <p className="driver-group-selected">Selected</p>}
        <p className="driver-group-title">{group.name}</p>
        <div ref={groupDriversRef} className="driver-group-drivers">
          {group.drivers.map((driver: driverType, i: number) => {
            if (i < lastIcon ) {
              return <ImageIcon key={i} src={driver.icon}/>
            } else if (i === lastIcon) {
              return (
                <CounterIcon 
                  key={i} 
                  inverted={selected} 
                  counter={group.drivers.length - lastIcon}
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

export default DriverGroupCard
