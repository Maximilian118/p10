import React, { SyntheticEvent } from "react"
import '../_button.scss'
import './_addButton.scss'
import { Add } from "@mui/icons-material"
import { IconButton } from "@mui/material"

interface addButton {
  onClick?: (e: SyntheticEvent) => void
  size?: "small" | "medium" | "large" | "contained"
  style?: React.CSSProperties
  absolute?: boolean
}

const AddButton: React.FC<addButton> = ({ onClick, size, style, absolute }) => (
  <IconButton 
    className={`button-${size ? size : "medium"} add-button${absolute ? "-absolute" : ""}`}
    style={style}
    onClick={onClick}
  >
    <Add/>
  </IconButton>
)

export default AddButton
