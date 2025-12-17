import React from "react"
import { ClickAwayListener } from "@mui/material"
import { ChampView } from "../Views/ChampSettings/ChampSettings"
import SettingsIcon from "@mui/icons-material/Settings"
import GavelIcon from "@mui/icons-material/Gavel"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import BarChartIcon from "@mui/icons-material/BarChart"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import "./_viewsDrawer.scss"

interface ViewsDrawerProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  view: ChampView
  setView: React.Dispatch<React.SetStateAction<ChampView>>
  canAccessSettings: boolean
}

// View item configuration.
interface ViewItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  visible?: boolean
  viewId?: ChampView
}

// Championship views drawer - slides up from bottom.
const ViewsDrawer: React.FC<ViewsDrawerProps> = ({
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

  // View items for the drawer.
  const items: ViewItem[] = [
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
      icon: <ReportProblemIcon />,
      label: "Protests",
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
      <div className={`views-drawer ${open ? "views-drawer-open" : ""}`}>
        {visibleItems.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className={`views-drawer-item ${item.viewId === view ? "views-drawer-item-active" : ""}`}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </div>
    </ClickAwayListener>
  )
}

export default ViewsDrawer
