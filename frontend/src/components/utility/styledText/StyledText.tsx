import React from "react"
import './_styledText.scss'

export type StyledTextColour = "gold" | "silver" | "bronze" | "default"

interface StyledTextProps {
  text: string | number
  colour?: StyledTextColour
}

// Renders text with optional podium styling (gold includes shimmer effect)
const StyledText: React.FC<StyledTextProps> = ({ text, colour = "default" }) => {
  const displayText = String(text)

  return (
    <span className={`styled-text ${colour}`} data-text={displayText}>
      {displayText}
    </span>
  )
}

export default StyledText
