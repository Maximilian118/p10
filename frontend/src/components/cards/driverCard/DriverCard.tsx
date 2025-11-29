import React from "react"
import './_driverCard.scss';
import { driverType } from "../../../shared/types";
import EditButton from "../../utility/button/editButton/EditButton";
import RemoveButton from "../../utility/button/removeButton/RemoveButton";
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon";

interface driverCardType {
  driver: driverType
  onClick?: (driver: driverType) => void
  canEdit?: boolean
  onRemove?: (driver: driverType) => void
  canRemove?: boolean
}

const DriverCard: React.FC<driverCardType> = ({ driver, onClick, canEdit, onRemove, canRemove }) => (
  <div className="driver-card" onClick={() => onClick && onClick(driver)}>
    <ImageIcon src={driver.url} style={{ marginRight: 16 }}/>
    <p className="driver-name">{driver.name}</p>
    <div className="toolbar">
      {canEdit && <EditButton/>}
      {canRemove && (
        <RemoveButton
          onClick={(e) => {
            e.stopPropagation()
            onRemove && onRemove(driver)
          }}
        />
      )}
    </div>
  </div>
)

export default DriverCard
