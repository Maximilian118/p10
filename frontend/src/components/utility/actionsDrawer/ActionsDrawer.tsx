import React from "react"
import { ClickAwayListener } from "@mui/material"
import './_actionsDrawer.scss'

interface actionsDrawerType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  children?: React.ReactNode
}

// Drawer component that slides up from the bottom of the container.
const ActionsDrawer: React.FC<actionsDrawerType> = ({ open, setOpen, children }) => {
  // Close drawer when clicking outside.
  const handleClickAway = () => {
    if (open) {
      setOpen(false)
    }
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className={`actions-drawer ${open ? "actions-drawer-open" : ""}`}>
        {children}
      </div>
    </ClickAwayListener>
  )
}

export default ActionsDrawer
