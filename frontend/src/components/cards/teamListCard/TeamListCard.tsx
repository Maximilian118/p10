import React, { SyntheticEvent } from "react"
import './_teamListCard.scss'
import { driverType, teamType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"

interface teamListCardType {
  team: teamType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
  onDriverClick?: (driver: driverType) => void
  highlight?: boolean
}

// Card for displaying a team in a list with driver icons underneath.
const TeamListCard: React.FC<teamListCardType> = ({ team, onClick, canEdit, onEditClicked, onDriverClick, highlight }) => {

  const className = `team-list-card${highlight ? ' team-list-card-highlight' : ''}`

  return (
    <div className={className} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={team.icon} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) onEditClicked(e)
          }}
        />}
      </div>
      <div className="team-list-content">
        <p className="team-list-title">{team.name}</p>
        <IconList items={team.drivers} onItemClick={onDriverClick} />
      </div>
    </div>
  )
}

export default TeamListCard
