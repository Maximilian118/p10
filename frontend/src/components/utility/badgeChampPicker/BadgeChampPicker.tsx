import React from "react"
import './_badgeChampPicker.scss'
import ChampSection from "./champSection/ChampSection"
import { userType } from "../../../shared/localStorage"

interface BadgeChampPickerProps {
  user: userType
}

const BadgeChampPicker: React.FC<BadgeChampPickerProps> = ({ user }) => {
  return (
    <div className="badge-champ-picker">
      {user.championships.map((c => 
        <ChampSection
          key={c._id}
          user={user} 
          champ={c}
        />
      ))}
    </div>
  )
}

export default BadgeChampPicker