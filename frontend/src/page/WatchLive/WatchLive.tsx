import React from "react"
import F1SessionView from "../Championship/Views/RoundStatus/APIViews/F1SessionView/F1SessionView"
import "./_watchLive.scss"

// Standalone page for watching a live F1 session outside of championship context.
// Renders F1SessionView with no round data — driver cards use OpenF1 headshots.
const WatchLive: React.FC = () => {
  return (
    <div className="watch-live-container">
      <F1SessionView />
    </div>
  )
}

export default WatchLive
