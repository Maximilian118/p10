import React from "react"
import { ClickAwayListener } from "@mui/material"
import { ChampView } from "../Views/ChampSettings/ChampSettings"
import SettingsIcon from "@mui/icons-material/Settings"
import GavelIcon from "@mui/icons-material/Gavel"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import BarChartIcon from "@mui/icons-material/BarChart"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import "./_actionsDrawer.scss"

interface ActionsDrawerProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  view: ChampView
  setView: React.Dispatch<React.SetStateAction<ChampView>>
  canAccessSettings: boolean
}

// Action item configuration.
interface ActionItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  visible?: boolean
  viewId?: ChampView
}

// Championship actions drawer - slides up from bottom.
const ActionsDrawer: React.FC<ActionsDrawerProps> = ({
  open,
  setOpen,
  view,
  setView,
  canAccessSettings,
}) => {
  // Close drawer when clicking outside.
  const handleClickAway = () => {
    if (open) {
      setOpen(false)
    }
  }

  // Handle settings click - close drawer and switch view.
  const handleSettingsClick = () => {
    setOpen(false)
    setView("settings")
  }

  // Close drawer only.
  const handleClose = () => {
    setOpen(false)
  }

  // Action items for the drawer.
  const items: ActionItem[] = [
    {
      icon: <SettingsIcon />,
      label: "Settings",
      onClick: handleSettingsClick,
      visible: canAccessSettings,
      viewId: "settings",
    },
    {
      icon: <GavelIcon />,
      label: "Rules and Regulations",
      onClick: handleClose,
    },
    {
      icon: <WorkspacePremiumIcon />,
      label: "Badges",
      onClick: handleClose,
    },
    {
      icon: <BarChartIcon />,
      label: "Statistics",
      onClick: handleClose,
    },
    {
      icon: <ArrowBackIcon />,
      label: "Back",
      onClick: handleClose,
    },
  ]

  // Filter items to only show visible ones (default to visible if not specified).
  const visibleItems = items.filter((item) => item.visible !== false)

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className={`actions-drawer ${open ? "actions-drawer-open" : ""}`}>
        {visibleItems.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className={`actions-drawer-item ${item.viewId === view ? "actions-drawer-item-active" : ""}`}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </div>
    </ClickAwayListener>
  )
}

export default ActionsDrawer
