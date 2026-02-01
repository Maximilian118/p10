import React, { useState } from "react"
import "./_badges.scss"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import BadgePicker from "../../../../components/utility/badgePicker/BadgePicker"
import BadgeInfoCard from "../../../../components/cards/badgeInfoCard/BadgeInfoCard"
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
  filtered: number[]
  setFiltered: React.Dispatch<React.SetStateAction<number[]>>
  onDefaultsReady: (defaults: badgeType[]) => void
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
  filtered,
  setFiltered,
  onDefaultsReady,
}) => {
  // State for the currently selected badge to display in BadgeInfoCard.
  const [ selectedBadge, setSelectedBadge ] = useState<badgeType | null>(null)
  // Displayed badge persists during close animation so content doesn't disappear instantly.
  const [ displayedBadge, setDisplayedBadge ] = useState<badgeType | null>(null)

  // Sync displayedBadge with selectedBadge, but delay clearing to allow close animation.
  React.useEffect(() => {
    if (selectedBadge) {
      setDisplayedBadge(selectedBadge)
    } else {
      const timeout = setTimeout(() => setDisplayedBadge(null), 300)
      return () => clearTimeout(timeout)
    }
  }, [selectedBadge])

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

  // Close badge info card when clicking anywhere outside a badge.
  const handleViewClick = () => {
    setSelectedBadge(null)
  }

  return (
    <div className="badges-view" onClick={handleViewClick}>
      <BadgeInfoCard badge={displayedBadge} isOpen={selectedBadge !== null} />
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
        hideFilterDraw={true}
        filtered={filtered}
        setFiltered={setFiltered}
        onDefaultsReady={onDefaultsReady}
      />
    </div>
  )
}

export default Badges
