import React, { SyntheticEvent } from "react"
import '../_button.scss'
import './_removeButton.scss'
import { IconButton } from "@mui/material"
import { Remove } from "@mui/icons-material"

interface removeButtonType {
  onClick?: (e: SyntheticEvent) => void
  size?: "small" | "medium" | "large" | "contained"
  style?: React.CSSProperties
}

const RemoveButton: React.FC<removeButtonType> = ({ onClick, size, style }) => {
  return (
    <IconButton
      className={`button-${size ? size : "small"} remove-button`}
      onClick={onClick}
      style={style}
    >
      <Remove/>
    </IconButton>
  )
}

export default RemoveButton
