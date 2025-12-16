import React, { SyntheticEvent } from "react"
import './_driverListCard.scss'
import { driverType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"

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
        <IconList items={driver.teams} onItemClick={onTeamClick} />
      </div>
    </div>
  )
}

export default DriverListCard
