import React from "react"
import './_muiSwitch.scss'
import { Switch } from "@mui/material"

interface MUISwitchType {
  text: string
  textRight?: boolean
}

const MUISwitch: React.FC<MUISwitchType> = ({ text, textRight }) => {
  const label = { inputProps: { 'aria-label': 'Switch' } }

  return (
    <div className="mui-switch">
      {!textRight && <p>{text}</p>}
      <Switch {...label}/>
      {textRight && <p>{text}</p>}
    </div>
  )
}

export default MUISwitch
