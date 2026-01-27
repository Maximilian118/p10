import React, { SyntheticEvent } from "react"
import './_driverListCard.scss'
import { driverType, DriverEntryType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import Points from "../../utility/points/Points"
import Banner from "../../utility/banner/Banner"

interface driverListCardType {
  driver: driverType
  entry?: DriverEntryType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onTeamClick?: (team: teamType) => void
  highlight?: boolean
}

// Card for displaying a driver in a list with team icons underneath.
const DriverListCard: React.FC<driverListCardType> = ({ driver, entry, onClick, canEdit, onEditClicked, onTeamClick, highlight }) => {
  return (
    <div className={`driver-list-card${highlight ? ' driver-list-card__highlight' : ''}${entry ? ' driver-list-card__entry' : ''}`} onClick={onClick}>
      {driver.official && <Banner text="Official"/>}
      <div className="main-icon-container">
        <ImageIcon src={driver.icon} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      {entry && <Points total={entry.grandTotalPoints} last={entry.grandTotalPoints - (entry.totalPoints - entry.points)} position={entry.position} />}
      <div className="driver-list-content">
        <p className="driver-list-title">{driver.name}</p>
        <IconList items={driver.teams} onItemClick={onTeamClick} />
      </div>
    </div>
  )
}

export default DriverListCard
