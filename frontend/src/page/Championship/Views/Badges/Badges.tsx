import React from "react"
import "./_badges.scss"
import { ChampType, badgeType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import BadgePicker from "../../../../components/utility/badgePicker/BadgePicker"

interface BadgesProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  isAdjudicator: boolean
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
}) => {
  // Create a wrapper form interface for BadgePicker compatibility.
  const badgeForm = { champBadges: champ.champBadges }

  // Handler to update champ state when badges are modified (adjudicator only).
  const setBadgeForm = (updater: React.SetStateAction<{ champBadges: badgeType[] }>) => {
    if (typeof updater === "function") {
      setChamp((prev) => {
        if (!prev) return prev
        const newBadgeForm = updater({ champBadges: prev.champBadges })
        return { ...prev, champBadges: newBadgeForm.champBadges }
      })
    } else {
      setChamp((prev) => (prev ? { ...prev, champBadges: updater.champBadges } : prev))
    }
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
        showUnearnedOverlay={true}
      />
    </div>
  )
}

export default Badges
