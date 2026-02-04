import React from "react"
import { ProtestType } from "../../../../shared/types"
import { formatRelativeTime } from "../../../../shared/utility"
import StatusCard from "../../../../components/cards/statusCard/StatusCard"
import "./_protestItem.scss"

interface ProtestItemProps {
  protest: ProtestType
  isAdjudicator?: boolean
  onClick?: () => void
}

// Protest item component for displaying individual protests in a list.
const ProtestItem: React.FC<ProtestItemProps> = ({ protest, isAdjudicator = false, onClick }) => {
  const isOpen = protest.status === "adjudicating" || protest.status === "voting"

  // Check if action is required (adjudicator needs to allocate points).
  const actionRequired =
    isAdjudicator && (protest.status === "passed" || protest.status === "denied") && !protest.pointsAllocated

  // Build container class name with closed modifier.
  const containerClass = ["protest-item", !isOpen && !actionRequired && "protest-item--closed"]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClass} onClick={onClick}>
      <h3 className="protest-item__title">{protest.title}</h3>

      <p className="protest-item__description">{protest.description}</p>

      <div className="protest-item__timestamp-row">
        {(isOpen || actionRequired) && (
          <span className={`protest-item__unread-dot ${actionRequired ? "protest-item__unread-dot--action" : ""}`} />
        )}
        <p className="protest-item__timestamp">{formatRelativeTime(protest.created_at)}</p>
        <span className="protest-item__separator">-</span>
        <p className="protest-item__author">{protest.competitor?.name}</p>
      </div>

      {/* Use the reusable StatusCard component */}
      <StatusCard status={protest.status} votes={protest.votes} actionRequired={actionRequired} />
    </div>
  )
}

export default ProtestItem
