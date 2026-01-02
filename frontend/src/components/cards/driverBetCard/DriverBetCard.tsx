import React from "react"
import "./_driverBetCard.scss"
import { driverType } from "../../../shared/types"
import { userType } from "../../../shared/localStorage"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface DriverBetCardProps {
  driver: driverType
  isMyBet: boolean
  isPending: boolean
  isRejected: boolean
  onClick: () => void
  takenBy?: userType
}

// Card component for displaying a driver in the betting grid.
// Shows bet status (my bet, taken by other, pending, rejected).
const DriverBetCard: React.FC<DriverBetCardProps> = ({
  driver,
  isMyBet,
  takenBy,
  isPending,
  isRejected,
  onClick
}) => {
  // Derive isTakenByOther from takenBy prop.
  const isTakenByOther = !!takenBy && !isMyBet

  return (
    <div
      className={`
        driver-bet-card
        ${isMyBet ? "my-bet" : ""}
        ${isTakenByOther ? "taken" : ""}
        ${isPending ? "pending" : ""}
        ${isRejected ? "rejected" : ""}
      `}
      onClick={onClick}
    >
      <p className="driver-name">{driver.driverID}</p>
      <img className="driver-icon" alt="driver" src={driver.icon}/>
      {takenBy && <ImageIcon src={takenBy.icon} size="large"/>}
    </div>
  )
}

export default DriverBetCard
