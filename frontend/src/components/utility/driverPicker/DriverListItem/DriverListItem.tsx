import React from "react"
import "./_driverListItem.scss"
import { driverType } from "../../../../shared/types"
import ImageIcon from "../../icon/imageIcon/ImageIcon"
import RemoveButton from "../../button/removeButton/RemoveButton"

interface DriverListItemProps {
  driver: driverType
  onRemove?: (driver: driverType) => void
  canRemove: boolean
  onClick?: () => void
  readOnly?: boolean
}

// List item component for displaying a driver in picker/selection contexts.
const DriverListItem: React.FC<DriverListItemProps> = ({ driver, onRemove, canRemove, onClick, readOnly }) => {
  // Handler for remove button click, prevents propagation to parent onClick.
  const handleRemove = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    if (onRemove) onRemove(driver)
  }

  return (
    <div
      className={`driver-list-item${onClick && !readOnly ? " clickable" : ""}`}
      onClick={readOnly ? undefined : onClick}
    >
      <ImageIcon src={driver.icon} size="medium" />
      <p className="driver-list-item-name">{driver.name}</p>
      {canRemove && <RemoveButton onClick={handleRemove} />}
    </div>
  )
}

export default DriverListItem
