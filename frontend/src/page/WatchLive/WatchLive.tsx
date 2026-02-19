import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import F1SessionView from "../Championship/Views/RoundStatus/APIViews/F1SessionView/F1SessionView"
import { getSocket } from "../../shared/socket/socketClient"
import "./_watchLive.scss"

// Standalone page for watching a live F1 session outside of championship context.
// Renders F1SessionView with no round data — driver cards use OpenF1 headshots.
// Automatically redirects to home when no active session is found.
const WatchLive: React.FC = () => {
  const navigate = useNavigate()

  // Redirect to home when the backend reports no active session.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleSession = (data: { active: boolean }) => {
      if (!data.active) navigate("/")
    }

    socket.on("openf1:session", handleSession)
    return () => { socket.off("openf1:session", handleSession) }
  }, [navigate])

  return (
    <div className="watch-live-container">
      <F1SessionView />
    </div>
  )
}

export default WatchLive
