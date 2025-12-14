import React, { SyntheticEvent } from "react"
import '../_button.scss'
import './_editButton.scss'
import { IconButton } from "@mui/material"
import { Edit } from "@mui/icons-material"

interface editButtonType {
  onClick?: (e: SyntheticEvent) => void
  size?: "small" | "medium" | "large" | "contained"
  style?: React.CSSProperties
  inverted?: boolean
  absolute?: boolean
}

// Edit button component with optional absolute positioning.
const EditButton: React.FC<editButtonType> = ({ onClick, size, style, inverted, absolute }) => {
  const getClassName = () => {
    const baseSize = `button-${size ? size : "small"}`
    if (absolute) return `${baseSize} edit-button-absolute`
    if (inverted) return `${baseSize} edit-button-inverted`
    return `${baseSize} edit-button`
  }

  return (
    <IconButton
      className={getClassName()}
      onClick={onClick}
      style={style}
    >
      <Edit/>
    </IconButton>
  )
}

export default EditButton
