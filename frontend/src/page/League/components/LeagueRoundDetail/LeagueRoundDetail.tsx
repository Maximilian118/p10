import React, { useState } from "react"
import "./_leagueRoundDetail.scss"
import { LeagueScoreType } from "../../../../shared/types"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"

interface leagueRoundDetailType {
  score: LeagueScoreType
  champName: string
}

// Expandable round detail showing prediction score and insights.
const LeagueRoundDetail: React.FC<leagueRoundDetailType> = ({ score, champName }) => {
  const [expanded, setExpanded] = useState<boolean>(false)
  const { insights } = score

  return (
    <div className="league-round-detail">
      <div className="league-round-header" onClick={() => setExpanded(!expanded)}>
        <span className="round-number">R{score.champRoundNumber}</span>
        <span className="round-score">{score.predictionScore.toFixed(1)}%</span>
        <span className="round-p10-hits">{insights.p10Hits} P10 hit{insights.p10Hits !== 1 ? "s" : ""}</span>
        <ExpandMoreIcon className={`round-expand-icon${expanded ? " expanded" : ""}`} />
      </div>
      {expanded && (
        <div className="league-round-body">
          <div className="round-insight-row">
            <span>Championship</span>
            <span>{champName}</span>
          </div>
          <div className="round-insight-row">
            <span>Competitors</span>
            <span>{insights.competitorsWhoBet}/{insights.totalCompetitors} bet</span>
          </div>
          <div className="round-insight-row">
            <span>Avg P10 Distance</span>
            <span>{insights.avgP10Distance.toFixed(1)}</span>
          </div>
          {insights.bestPrediction && (
            <div className="round-insight-row round-highlight">
              <div className="round-prediction">
                <ImageIcon src={insights.bestPrediction.competitor?.icon || ""} size="small" />
                <span>Best: {insights.bestPrediction.competitor?.name}</span>
              </div>
              <span>{insights.bestPrediction.predictionScore.toFixed(1)}% (P{insights.bestPrediction.driverPosition})</span>
            </div>
          )}
          {insights.worstPrediction && (
            <div className="round-insight-row">
              <div className="round-prediction">
                <ImageIcon src={insights.worstPrediction.competitor?.icon || ""} size="small" />
                <span>Worst: {insights.worstPrediction.competitor?.name}</span>
              </div>
              <span>{insights.worstPrediction.predictionScore.toFixed(1)}% (P{insights.worstPrediction.driverPosition})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LeagueRoundDetail
