import { useState, useEffect } from "react"
import { getSocket } from "../socket/socketClient"

// Socket event for global live session status (broadcast to all clients).
const LIVE_SESSION_EVENT = "f1:live-session"

interface LiveSessionState {
  active: boolean
  sessionType: string
  trackName: string
}

// Maps OpenF1 session names to short display names for the nav button.
const getSessionShortName = (sessionType: string): string => {
  const mapping: Record<string, string> = {
    "Practice 1": "P1",
    "Practice 2": "P2",
    "Practice 3": "P3",
    "Qualifying": "Q",
    "Sprint Qualifying": "Sprint Q",
    "Sprint Shootout": "Sprint Q",
    "Sprint": "Sprint",
    "Race": "Race",
  }
  return mapping[sessionType] || sessionType
}

// Hook that provides live F1 session status for the nav bar.
// Listens for the global f1:live-session broadcast from the backend.
const useLiveSession = (): LiveSessionState & { shortName: string } => {
  const [state, setState] = useState<LiveSessionState>({
    active: false,
    sessionType: "",
    trackName: "",
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Handle live session status updates.
    const handleLiveSession = (data: LiveSessionState) => {
      setState(data)
    }

    socket.on(LIVE_SESSION_EVENT, handleLiveSession)
    return () => { socket.off(LIVE_SESSION_EVENT, handleLiveSession) }
  }, [])

  return {
    ...state,
    shortName: getSessionShortName(state.sessionType),
  }
}

export default useLiveSession
