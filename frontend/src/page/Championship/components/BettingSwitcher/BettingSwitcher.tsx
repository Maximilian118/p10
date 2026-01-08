import React from "react"
import './_betting-switcher.scss';

interface BettingSwitcherType {
  isActive: boolean
  onToggle: () => void
}

// Toggle component for adjudicators to switch between betting for themselves and placing bets for others.
const BettingSwitcher: React.FC<BettingSwitcherType> = ({ isActive, onToggle }) => {
  return (
    <div className="betting-switcher" onClick={onToggle}>
      <div className={`switcher-highlight ${isActive ? 'right' : ''}`} />
      <div className={`switcher-option ${!isActive ? 'active' : ''}`}>
        <span>My Bet</span>
      </div>
      <div className={`switcher-option ${isActive ? 'active' : ''}`}>
        <span>Place for Others</span>
      </div>
    </div>
  )
}

export default BettingSwitcher
