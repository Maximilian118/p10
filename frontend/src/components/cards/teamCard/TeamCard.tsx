import React from "react"
import './_teamCard.scss';
import { teamType } from "../../../shared/types";
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon";
import EditButton from "../../utility/button/editButton/EditButton";
import RemoveButton from "../../utility/button/removeButton/RemoveButton";

interface teamCardType {
  team: teamType
  onClick?: (team: teamType) => void
  canEdit?: boolean
  onRemove?: (team: teamType) => void
  canRemove?: boolean
}

const TeamCard: React.FC<teamCardType> = ({ team, onClick, canEdit, onRemove, canRemove }) => (
  <div className="team-card" onClick={() => onClick && onClick(team)}>
    <ImageIcon src={team.icon} style={{ marginRight: 16 }}/>
    <p className="team-name">{team.name}</p>
    <div className="toolbar">
      {canEdit && <EditButton/>}
      {canRemove && (
        <RemoveButton
          onClick={(e) => {
            e.stopPropagation()
            if (onRemove) onRemove(team)
          }}
        />
      )}
    </div>
  </div>
)

export default TeamCard
