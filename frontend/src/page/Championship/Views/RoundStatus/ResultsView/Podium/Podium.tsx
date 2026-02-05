import React from "react"
import "./_podium.scss"
import { CompetitorEntryType } from "../../../../../../shared/types"
import { getCompetitorName, getCompetitorIcon, getCompetitorId } from "../../../../../../shared/utility"
import ImageIcon from "../../../../../../components/utility/icon/imageIcon/ImageIcon"
import StyledText, { StyledTextColour } from "../../../../../../components/utility/styledText/StyledText"
import moment from "moment"

interface PodiumProps {
  competitors: CompetitorEntryType[] // Top 3, sorted by round points descending.
}

// Maps podium position (1-3) to StyledText colour.
const podiumColour = (position: number): StyledTextColour => {
  if (position === 1) return "gold"
  if (position === 2) return "silver"
  return "bronze"
}

// Renders the top 3 competitors in a motorsport-style podium layout.
// DOM order: [2nd] [1st] [3rd] — 1st is elevated highest in the centre.
const Podium: React.FC<PodiumProps> = ({ competitors }) => {
  // Rearrange into podium display order: 2nd, 1st, 3rd.
  const podiumOrder = [competitors[1], competitors[0], competitors[2]].filter(Boolean)

  // Map position based on original sorted order (index 0 = 1st, 1 = 2nd, 2 = 3rd).
  const getPosition = (entry: CompetitorEntryType): number => {
    const idx = competitors.indexOf(entry)
    return idx + 1
  }

  return (
    <div className="podium">
      {podiumOrder.map(entry => {
        const position = getPosition(entry)
        const competitorId = getCompetitorId(entry)
        const ordinalText = moment.localeData().ordinal(position)

        return (
          <div key={competitorId} className={`podium__slot podium__slot--${position === 1 ? "first" : position === 2 ? "second" : "third"}`}>
            {/* Competitor icon with "Best!" indicator. */}
            <div className="podium__icon-wrapper">
              <ImageIcon src={getCompetitorIcon(entry)} size="xx-large" />
            </div>

            {/* Competitor name. */}
            <p className="podium__name">{getCompetitorName(entry)}</p>

            {/* Position ordinal with podium colour. */}
            <StyledText text={ordinalText} color={podiumColour(position)} />
          </div>
        )
      })}
    </div>
  )
}

export default Podium
