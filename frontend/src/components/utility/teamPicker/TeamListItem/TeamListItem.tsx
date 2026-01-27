import React from "react"
import "./_teamListItem.scss"
import { teamType } from "../../../../shared/types"
import ImageIcon from "../../icon/imageIcon/ImageIcon"
import RemoveButton from "../../button/removeButton/RemoveButton"

interface TeamListItemProps {
  team: teamType
  onRemove?: () => void
  canRemove: boolean
  onClick?: () => void
  readOnly?: boolean                // View-only mode (no click-to-edit)
}

// List item component for displaying a team in picker/selection contexts.
const TeamListItem: React.FC<TeamListItemProps> = ({ team, onRemove, canRemove, onClick, readOnly }) => {
  // Handler for remove button click, prevents propagation to parent onClick.
  const handleRemove = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    if (onRemove) onRemove()
  }

  return (
    <div
      className={`team-list-item${onClick && !readOnly ? " clickable" : ""}`}
      onClick={readOnly ? undefined : onClick}
    >
      <ImageIcon src={team.icon} size="medium" />
      <p className="team-list-item-name">{team.name}</p>
      {canRemove && <RemoveButton onClick={handleRemove} />}
    </div>
  )
}

export default TeamListItem
