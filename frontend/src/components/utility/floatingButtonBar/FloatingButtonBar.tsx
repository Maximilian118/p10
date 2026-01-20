import React from "react"
import { Button, IconButton, CircularProgress } from "@mui/material"
import "./_floatingButtonBar.scss"
import "../button/_button.scss"
import "../button/addButton/_addButton.scss"

export interface FloatingButtonConfig {
  label?: string // Optional - no label renders as IconButton
  onClick?: () => void
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  color?: "primary" | "inherit" | "secondary" | "success" | "error" | "info" | "warning"
  disabled?: boolean
  loading?: boolean
  className?: string
}

interface FloatingButtonBarProps {
  buttons?: FloatingButtonConfig[]
  leftButtons?: FloatingButtonConfig[]
  rightButtons?: FloatingButtonConfig[]
  children?: React.ReactNode
}

// Floating button bar for page toolbars (championship, profile, settings).
// Absolutely positioned at bottom with transparent background.
const FloatingButtonBar: React.FC<FloatingButtonBarProps> = ({ buttons, leftButtons, rightButtons, children }) => {
  // Children mode for fully custom layouts.
  if (children) {
    return <div className="floating-button-bar">{children}</div>
  }

  // Handle button click with stopPropagation to prevent event bubbling.
  const handleClick = (e: React.MouseEvent, onClick?: () => void) => {
    e.stopPropagation()
    if (onClick) onClick()
  }

  // Render a single button from config.
  const renderButton = (btn: FloatingButtonConfig, index: number) => {
    const loadingIcon = <CircularProgress size={16} color="inherit" />

    // No label = IconButton (use endIcon or startIcon for the icon).
    if (!btn.label) {
      const icon = btn.loading ? loadingIcon : (btn.endIcon || btn.startIcon)
      return (
        <IconButton
          key={index}
          color={btn.color ?? "primary"}
          disabled={btn.disabled}
          onClick={e => handleClick(e, btn.onClick)}
          className={btn.className}
        >
          {icon}
        </IconButton>
      )
    }

    // Standard buttons render as rectangular Button.
    return (
      <Button
        key={index}
        variant="contained"
        size="small"
        color={btn.color ?? "primary"}
        disabled={btn.disabled}
        onClick={e => handleClick(e, btn.onClick)}
        className={btn.className}
        startIcon={btn.loading ? loadingIcon : btn.startIcon}
        endIcon={btn.endIcon}
      >
        {btn.label}
      </Button>
    )
  }

  // Grouped layout with left/right button arrays.
  if (leftButtons || rightButtons) {
    return (
      <div className="floating-button-bar">
        <div className="floating-button-group">
          {leftButtons?.map((btn, i) => renderButton(btn, i))}
        </div>
        <div className="floating-button-group">
          {rightButtons?.map((btn, i) => renderButton(btn, i))}
        </div>
      </div>
    )
  }

  // Flat layout with single buttons array.
  return (
    <div className="floating-button-bar">
      {buttons?.map((btn, index) => renderButton(btn, index))}
    </div>
  )
}

export default FloatingButtonBar
