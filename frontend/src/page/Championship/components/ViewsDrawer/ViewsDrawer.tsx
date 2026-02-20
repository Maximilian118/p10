import React from "react"
import { ClickAwayListener } from "@mui/material"
import { ChampView } from "../../Views/ChampSettings/ChampSettings"
import SettingsIcon from "@mui/icons-material/Settings"
import GavelIcon from "@mui/icons-material/Gavel"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import BarChartIcon from "@mui/icons-material/BarChart"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import VisibilityIcon from "@mui/icons-material/Visibility"
import "./_viewsDrawer.scss"

interface ViewsDrawerProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  view: ChampView
  setView: (view: ChampView) => void
  onBackToDefault: () => void
  canAccessSettings: boolean
  isAdmin: boolean
  isAdjudicator: boolean
  adjudicatorViewActive?: boolean
  onToggleAdjudicatorView?: () => void
}

// View item configuration.
interface ViewItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  visible?: boolean
  viewId?: ChampView
  isToggle?: boolean
  isActive?: boolean
}

// Championship views drawer - slides up from bottom.
const ViewsDrawer: React.FC<ViewsDrawerProps> = ({
  open,
  setOpen,
  view,
  setView,
  onBackToDefault,
  canAccessSettings,
  isAdmin,
  isAdjudicator,
  adjudicatorViewActive,
  onToggleAdjudicatorView,
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
      icon: <AdminPanelSettingsIcon />,
      label: "Admin",
      onClick: () => {
        setOpen(false)
        setView("admin")
      },
      visible: isAdmin,
      viewId: "admin",
    },
    {
      icon: <SettingsIcon />,
      label: "Settings",
      onClick: handleSettingsClick,
      viewId: "settings",
    },
    {
      icon: <VisibilityIcon />,
      label: "Adjudicator View",
      onClick: () => {
        setOpen(false)
        onToggleAdjudicatorView?.()
      },
      visible: canAccessSettings,
      isToggle: true,
      isActive: adjudicatorViewActive,
    },
    {
      icon: <GavelIcon />,
      label: "Rules and Regulations",
      onClick: () => {
        setOpen(false)
        setView("rulesAndRegs")
      },
      viewId: "rulesAndRegs",
    },
    {
      icon: <ReportProblemIcon />,
      label: "Protests",
      onClick: () => {
        setOpen(false)
        setView("protests")
      },
      viewId: "protests",
    },
    {
      icon: <WorkspacePremiumIcon />,
      label: "Badges",
      onClick: () => {
        setOpen(false)
        setView("badges")
      },
      viewId: "badges",
    },
    {
      icon: <BarChartIcon />,
      label: "Statistics",
      onClick: () => {
        setOpen(false)
        setView("statistics")
      },
      viewId: "statistics",
    },
    {
      icon: <ArrowBackIcon />,
      label: "Back",
      onClick: () => {
        setOpen(false)
        onBackToDefault()
      },
    },
  ]

  // Filter items to only show visible ones (default to visible if not specified).
  const visibleItems = items.filter((item) => item.visible !== false)

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className={`views-drawer ${open ? "views-drawer-open" : ""}`}>
        {visibleItems.map((item, index) => {
          // Determine if item should show active state.
          const isActive = item.isToggle ? item.isActive : item.viewId === view
          return (
            <div
              key={index}
              onClick={item.onClick}
              className={`views-drawer-item ${isActive ? "views-drawer-item-active" : ""}`}
            >
              {item.icon}
              {item.label}
            </div>
          )
        })}
      </div>
    </ClickAwayListener>
  )
}

export default ViewsDrawer
