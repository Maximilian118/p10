import React from "react"
import "./_champQuickStats.scss"
import { userChampSnapshotType } from "../../../../shared/types"
import Points from "../../points/Points"
import Position from "../../position/Position"

interface ChampQuickStatsProps {
  champ: userChampSnapshotType
}

// Displays user's quick stats for a championship using pre-calculated snapshot data.
const ChampQuickStats: React.FC<ChampQuickStatsProps> = ({ champ }) => {
  return (
    <div className="champ-quick-stats">
      {champ.deleted ? (
        <p className="champ-deleted">Deleted</p>
      ) : (
        <>
          <Position position={champ.position} season={champ.season} change={champ.positionChange}/>
          <Points total={champ.totalPoints} last={champ.lastPoints}/>
        </>
      )}
    </div>
  )
}

export default ChampQuickStats
