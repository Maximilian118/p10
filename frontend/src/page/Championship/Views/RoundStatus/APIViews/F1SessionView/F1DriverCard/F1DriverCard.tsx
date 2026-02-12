import React from "react"
import "./_f1DriverCard.scss"
import { driverType } from "../../../../../../../shared/types"
import { DriverLiveState } from "../../../../../../../api/openAPI/types"
import ImageIcon from "../../../../../../../components/utility/icon/imageIcon/ImageIcon"

interface F1DriverCardProps {
  state: DriverLiveState
  champDriver?: driverType
  selected?: boolean
  onClick?: () => void
}

// Displays a driver card with their icon image from the championship driver data.
// Falls back to the OpenF1 headshot URL if no championship match is found.
const F1DriverCard: React.FC<F1DriverCardProps> = ({ state, champDriver, selected, onClick }) => {
  // Use championship driver icon if available, otherwise fall back to OpenF1 headshot.
  const imageUrl = champDriver?.icon || state.headshotUrl || ""

  const className = `f1-driver-card${selected ? " f1-driver-card--selected" : ""}`

  return (
    <div className={className} onClick={onClick}>
      {imageUrl && <ImageIcon src={imageUrl} size="medium" background/>}
    </div>
  )
}

export default F1DriverCard
