import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_driverGroupListCard.scss'
import { driverGroupType, driverType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface driverGroupListCardType {
  group: driverGroupType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
}

// Card for displaying a driver group in a list with driver icons underneath.
const DriverGroupListCard: React.FC<driverGroupListCardType> = ({ group, onClick, canEdit, onEditClicked }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const groupDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many driver icons can fit in the container.
  useEffect(() => {
    const dListWidth = groupDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  return (
    <div className="driver-group-list-card" onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={group.url} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            onEditClicked && onEditClicked(e)
          }}
        />}
      </div>
      <div className="driver-group-list-content">
        <p className="driver-group-list-title">{group.name}</p>
        <div ref={groupDriversRef} className="driver-group-list-drivers">
          {group.drivers.map((driver: driverType, i: number) => {
            if (i < lastIcon) {
              return <ImageIcon key={i} src={driver.url}/>
            } else if (i === lastIcon) {
              return (
                <CounterIcon
                  key={i}
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

export default DriverGroupListCard
