import React, { useState, useRef, useEffect } from "react"
import UserIcon from "../utility/icon/userIcon/userIcon"
import { userType } from "../../shared/localStorage"
import { Home, Menu as MenuIcon, Close, Notifications, NotificationsNone } from "@mui/icons-material"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import SportsScoreIcon from "@mui/icons-material/SportsScore"
import GroupsIcon from "@mui/icons-material/Groups"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import { Shield } from "lucide-react"
import { IconButton, Button } from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"
import "./_nav.scss"
import BadgeIcon from "../utility/icon/badgeIcon/BadgeIcon"
import useConnectionStatus from "../../shared/hooks/useConnectionStatus"
import useLiveSession from "../../shared/hooks/useLiveSession"
import { useSessionBanner } from "../../api/openAPI/useSessionBanner"
import SessionStats from "../../page/Championship/components/SessionStats/SessionStats"

interface navType {
  user: userType,
}

// Menu items for the drawer.
const menuItems = [
  { text: "Leagues", url: "/leagues", icon: <Shield size={24} /> },
  { text: "Championships", url: "/championships", icon: <EmojiEventsIcon /> },
  { text: "Series", url: "/series", icon: <SportsScoreIcon /> },
  { text: "Teams", url: "/teams", icon: <GroupsIcon /> },
  { text: "Drivers", url: "/drivers", icon: <SportsMotorsportsIcon /> },
]

const Nav: React.FC<navType> = ({ user }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const serverMsg = useConnectionStatus()
  const liveSession = useLiveSession()
  const isOnWatchLive = location.pathname === "/watch-live"
  const sessionBanner = useSessionBanner(isOnWatchLive, false)

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

  // Navigate to notifications page.
  const handleNotificationsClicked = () => {
    navigate("/notifications")
  }

  // Unread notifications count from user state.
  const notificationsCount = user.notificationsCount || 0

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
        {/* Priority: server msg > session clock (on /watch-live) > watch live button > nothing */}
        {serverMsg
          ? <p className="server-msg">{serverMsg}</p>
          : isOnWatchLive && liveSession.active
            ? <div className="nav-session-stats">
                <SessionStats flag={sessionBanner.currentFlag} remainingMs={sessionBanner.remainingMs} currentLap={sessionBanner.currentLap} totalLaps={sessionBanner.totalLaps} size={16} />
              </div>
            : liveSession.active && (
                <Button
                  className="watch-live-btn"
                  size="small"
                  onClick={() => navigate("/watch-live")}
                >
                  Watch {liveSession.shortName}
                </Button>
              )
        }
        <div className="nav-right">
          <BadgeIcon 
            svg={notificationsCount === 0 ? NotificationsNone : Notifications}
            onClick={() => handleNotificationsClicked()} 
            count={notificationsCount}
          />
          <UserIcon user={user} style={{ marginLeft: 10 }}/>
        </div>
      </nav>
      <div className={`nav-drawer ${drawerOpen ? "nav-drawer-open" : ""}`}>
        {menuItems.map((item) => (
          <div
            key={item.url}
            className={`nav-drawer-item ${location.pathname === item.url ? "nav-drawer-item-active" : ""}`}
            onClick={() => handleMenuItemClick(item.url)}
          >
            {item.icon}
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Nav