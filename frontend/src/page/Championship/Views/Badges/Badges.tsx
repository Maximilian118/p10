import React, { useState } from "react"
import "./_badges.scss"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import BadgePicker from "../../../../components/utility/badgePicker/BadgePicker"
import BadgeModal from "../../../../components/modal/configs/BadgeModal/BadgeModal"
import { BadgePickerEditRef } from "../../../../components/utility/badgePicker/badgePickerEdit/BadgePickerEdit"

interface BadgesProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  isAdjudicator: boolean
  isEdit: boolean | badgeType
  setIsEdit: React.Dispatch<React.SetStateAction<boolean | badgeType>>
  draw: boolean
  setDraw: React.Dispatch<React.SetStateAction<boolean>>
  onEditHandlersReady?: (handlers: BadgePickerEditRef) => void
}

// Badges view component - displays championship badges with earned status overlay.
const Badges: React.FC<BadgesProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  backendErr,
  setBackendErr,
  isAdjudicator,
  isEdit,
  setIsEdit,
  draw,
  setDraw,
  onEditHandlersReady,
}) => {
  // State for the currently selected badge to display in BadgeModal.
  const [ selectedBadge, setSelectedBadge ] = useState<badgeType | null>(null)

  // Create a wrapper form interface for BadgePicker compatibility.
  // champBadges may be undefined if not yet loaded (lazy loading).
  const badgeForm = { champBadges: champ.champBadges || [] }

  // Handler to update champ state when badges are modified (adjudicator only).
  const setBadgeForm = (updater: React.SetStateAction<{ champBadges: badgeType[] }>) => {
    if (typeof updater === "function") {
      setChamp((prev) => {
        if (!prev) return prev
        const newBadgeForm = updater({ champBadges: prev.champBadges || [] })
        return { ...prev, champBadges: newBadgeForm.champBadges }
      })
    } else {
      setChamp((prev) => (prev ? { ...prev, champBadges: updater.champBadges } : prev))
    }
  }

  // Toggle badge selection - clicking same badge closes it, different badge opens new one.
  const handleBadgeClick = (badge: badgeType) => {
    setSelectedBadge(prev => prev?._id === badge._id ? null : badge)
  }

  return (
    <div className="badges-view">
      <BadgePicker
        form={badgeForm}
        setForm={setBadgeForm}
        user={user}
        setUser={setUser}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        readOnly={!isAdjudicator}
        hideToolbar={true}
        isEdit={isEdit}
        setIsEdit={setIsEdit}
        draw={draw}
        setDraw={setDraw}
        onEditHandlersReady={onEditHandlersReady}
        championship={champ._id}
        onBadgeClick={handleBadgeClick}
      />
      {/* Badge detail modal — opens when a badge is clicked */}
      {selectedBadge && (
        <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  )
}

export default Badges
