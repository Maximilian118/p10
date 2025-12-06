import React, { useState, useRef, useEffect } from "react"
import UserIcon from "../utility/userIcon/UserIcon"
import { userType } from "../../shared/localStorage"
import { Home, Menu as MenuIcon, Close } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"
import "./_nav.scss"

interface navType {
  user: userType,
}

// Menu items for the drawer.
const menuItems = [
  { text: "Championships", url: "/championships" },
  { text: "Driver Groups", url: "/driver-groups" },
  { text: "Teams", url: "/teams" },
  { text: "Drivers", url: "/drivers" },
]

const Nav: React.FC<navType> = ({ user }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close drawer when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerOpen && navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setDrawerOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [drawerOpen])

  // Toggle the drawer open/closed.
  const toggleDrawer = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDrawerOpen(prev => !prev)
  }

  // Close drawer when clicking on the nav.
  const handleNavClick = () => {
    if (drawerOpen) {
      setDrawerOpen(false)
    }
  }

  // Navigate to a page and close the drawer.
  const handleMenuItemClick = (url: string) => {
    navigate(url)
    setDrawerOpen(false)
  }

  return (
    <div className="nav-container" ref={navContainerRef}>
      <nav onClick={handleNavClick}>
        <div className="nav-left">
          <IconButton
            className={`nav-icon ${location.pathname === "/" ? "nav-icon-active" : ""}`}
            onClick={() => navigate("/")}
          >
            <Home />
          </IconButton>
          <IconButton
            className={`nav-icon ${drawerOpen ? "nav-icon-active" : ""}`}
            onClick={toggleDrawer}
          >
            {drawerOpen ? <Close /> : <MenuIcon />}
          </IconButton>
        </div>
        <UserIcon user={user} style={{ marginRight: 20 }}/>
      </nav>
      <div className={`nav-drawer ${drawerOpen ? "nav-drawer-open" : ""}`}>
        {menuItems.map((item) => (
          <div
            key={item.url}
            className={`nav-drawer-item ${location.pathname === item.url ? "nav-drawer-item-active" : ""}`}
            onClick={() => handleMenuItemClick(item.url)}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Nav