import React from "react"
import "./_automation.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { ChampView } from "../ChampSettings/ChampSettings"

interface AutomationProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
}

// Automation view for F1 championship automation features.
const Automation: React.FC<AutomationProps> = ({ champ, user, setView }) => {
  return (
    <div className="automation-view">
      <h3>Automation</h3>
      <p>Configure automation settings for {champ.name}</p>
    </div>
  )
}

export default Automation
