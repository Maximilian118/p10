import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_driverListCard.scss'
import { driverType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface driverListCardType {
  driver: driverType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onTeamClick?: (team: teamType) => void
  highlight?: boolean
}

// Card for displaying a driver in a list with team icons underneath.
const DriverListCard: React.FC<driverListCardType> = ({ driver, onClick, canEdit, onEditClicked, onTeamClick, highlight }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const driverTeamsRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many team icons can fit in the container.
  useEffect(() => {
    const tListWidth = driverTeamsRef.current?.getBoundingClientRect().width

    if (tListWidth) {
      setLastIcon(Math.floor(tListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  const className = `driver-list-card${highlight ? ' driver-list-card-highlight' : ''}`

  return (
    <div className={className} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={driver.icon} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      <div className="driver-list-content">
        <p className="driver-list-title">{driver.name}</p>
        <div ref={driverTeamsRef} className="driver-list-teams">
          {driver.teams.map((team: teamType, i: number) => {
            if (i < lastIcon) {
              return (
                <ImageIcon
                  key={i}
                  src={team.icon}
                  onClick={onTeamClick ? (e) => {
                    e.stopPropagation()
                    onTeamClick(team)
                  } : undefined}
                />
              )
            } else if (i === lastIcon) {
              return (
                <CounterIcon
                  key={i}
                  counter={driver.teams.length - lastIcon}
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

export default DriverListCard
