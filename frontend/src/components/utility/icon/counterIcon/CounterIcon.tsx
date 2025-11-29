import React from "react"
import '../_icon.scss'
import './_counterIcon.scss'

interface iconCounterType {
  counter: number
  size?: "small" | "medium" | "large" | "contained"
  inverted?: boolean
}

const CounterIcon: React.FC<iconCounterType> = ({ counter, size, inverted }) => {
  return (
    <div className={`icon-${size ? size : "medium"} counter-icon${inverted ? "-inverted" : ""}`}>
      <p className="count">{`+${counter}`}</p>
    </div>
  )
}

export default CounterIcon
