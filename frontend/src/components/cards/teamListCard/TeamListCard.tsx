import React, { SyntheticEvent } from "react"
import './_teamListCard.scss'
import { driverType, TeamEntryType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"
import Points from "../../utility/points/Points"

interface teamListCardType {
  team: teamType
  entry?: TeamEntryType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onDriverClick?: (driver: driverType) => void
  highlight?: boolean
}

// Card for displaying a team in a list with driver icons underneath.
const TeamListCard: React.FC<teamListCardType> = ({ team, entry, onClick, canEdit, onEditClicked, onDriverClick, highlight }) => {
  return (
    <div className={`team-list-card${highlight ? ' team-list-card__highlight' : ''}${entry ? ' team-list-card__entry' : ''}`} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={team.icon} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      {entry && <Points total={entry.grandTotalPoints} last={entry.grandTotalPoints - (entry.totalPoints - entry.points)} position={entry.position} />}
      <div className="team-list-content">
        <p className="team-list-title">{team.name}</p>
        <IconList items={team.drivers} onItemClick={onDriverClick} />
      </div>
    </div>
  )
}

export default TeamListCard
