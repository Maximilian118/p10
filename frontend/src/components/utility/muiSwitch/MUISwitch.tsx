import React from "react"
import './_muiSwitch.scss'
import { Switch } from "@mui/material"

interface MUISwitchType {
  text: string
  textRight?: boolean // Is the text left or right of the switch?
  fullWidth?: boolean // Display MUISwitch as full width of the container
  checked?: boolean // Controlled checked state
  onChange?: (checked: boolean) => void // Callback when switch is toggled
}

const MUISwitch: React.FC<MUISwitchType> = ({ text, textRight, fullWidth, checked, onChange }) => {
  const label = { inputProps: { 'aria-label': text } }

  // Handle switch toggle.
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.checked)
  }

  return (
    <div className={`mui-switch ${fullWidth ? 'mui-switch__full-width' : ''}`}>
      {!textRight && <p>{text}</p>}
      <Switch {...label} checked={checked} onChange={handleChange} />
      {textRight && <p>{text}</p>}
    </div>
  )
}

export default MUISwitch
