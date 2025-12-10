import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_teamListCard.scss'
import { driverType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface teamListCardType {
  team: teamType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  highlight?: boolean
}

// Card for displaying a team in a list with driver icons underneath.
const TeamListCard: React.FC<teamListCardType> = ({ team, onClick, canEdit, onEditClicked, highlight }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const teamDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  // Calculate how many driver icons can fit in the container.
  useEffect(() => {
    const dListWidth = teamDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  const className = `team-list-card${highlight ? ' team-list-card-highlight' : ''}`

  return (
    <div className={className} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={team.url} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      <div className="team-list-content">
        <p className="team-list-title">{team.name}</p>
        <div ref={teamDriversRef} className="team-list-drivers">
          {team.drivers.map((driver: driverType, i: number) => {
            if (i < lastIcon) {
              return <ImageIcon key={i} src={driver.icon}/>
            } else if (i === lastIcon) {
              return (
                <CounterIcon
                  key={i}
                  counter={team.drivers.length - lastIcon}
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

export default TeamListCard
