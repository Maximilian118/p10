import React from "react"
import "./_champQuickStats.scss"
import { ChampType } from "../../../../shared/types"
import Points from "../../points/Points"
import Position from "../../position/Position"

interface ChampQuickStatsProps {
  champ: ChampType
  userId: string
}

const ChampQuickStats: React.FC<ChampQuickStatsProps> = ({ champ, userId }) => {
  // Find the last COMPLETED round (same pattern as Championship page).
  const completedRounds = champ.rounds?.filter(r => r.status === "completed") ?? []
  const latestCompletedRound = completedRounds.length > 0
    ? completedRounds[completedRounds.length - 1]
    : champ.rounds?.[0]

  // Find user's entry in that round.
  const userEntry = latestCompletedRound?.competitors?.find(
    c => c.competitor?._id === userId
  )

  // Calculate position change from previous completed round.
  const previousRound = completedRounds.length > 1
    ? completedRounds[completedRounds.length - 2]
    : null
  const previousEntry = previousRound?.competitors?.find(
    c => c.competitor?._id === userId
  )
  const positionChange = previousEntry && userEntry
    ? previousEntry.position - userEntry.position
    : undefined

  const position = userEntry?.position ?? 0
  const totalPoints = userEntry?.totalPoints ?? 0
  const lastPoints = userEntry?.points ?? 0

  return (
    <div className="champ-quick-stats">
      <Position position={position} season={champ.season} change={positionChange}/>
      <Points total={totalPoints} last={lastPoints}/>
    </div>
  )
}

export default ChampQuickStats
