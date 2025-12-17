import React from "react"
import './_toggle.scss'
import { Switch } from "@mui/material"

interface ToggleTypes {
  text: string
  checked: boolean
  onChange: (checked: boolean) => void
}

// Controlled toggle component for boolean settings
const Toggle: React.FC<ToggleTypes> = ({ text, checked, onChange }) => {
  const label = { inputProps: { 'aria-label': text } }

  return (
    <div className="toggle-container">
      <p>{text}</p>
      <Switch
        {...label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  )
}

export default Toggle
