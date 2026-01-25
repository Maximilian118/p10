import React, { SyntheticEvent } from "react"
import '../_button.scss'
import './_addButton.scss'
import { Add } from "@mui/icons-material"
import { Button } from "@mui/material"

interface addButton {
  onClick?: (e: SyntheticEvent) => void
  size?: "small" | "medium" | "large" | "contained"
  style?: React.CSSProperties
  absolute?: boolean
  text?: string
}

const AddButton: React.FC<addButton> = ({ onClick, size, style, absolute, text }) => (
  <Button
    className={`
      button-${size ? size : "medium"} 
      add-button${absolute ? "-absolute" : ""}
      ${text ? " add-button--with-text" : ""}
    `}
    style={style}
    onClick={onClick}
    endIcon={text ? <Add/> : undefined}
  >
    {text || <Add/>}
  </Button>
)

export default AddButton
