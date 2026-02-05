import React from "react"
import './_styledText.scss'

export type StyledTextColour = "gold" | "silver" | "bronze" | "success" | "error" | "default"

interface StyledTextProps {
  text: string | number
  color?: StyledTextColour
}

// Renders text with optional podium styling.
const StyledText: React.FC<StyledTextProps> = ({ text, color = "default" }) => {
  const displayText = String(text)

  return (
    <span className={`styled-text ${color}`}>
      {displayText}
    </span>
  )
}

export default StyledText
